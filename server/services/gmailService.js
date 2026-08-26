/**
 * KMRL DocuSense - Gmail API Service with OAuth 2.0
 *
 * Replaces IMAP/SMTP authentication with Gmail API + OAuth 2.0.
 * Handles:
 * - OAuth 2.0 authentication and token refresh
 * - Reading incoming Gmail messages (INBOX only, unread)
 * - Downloading attachments
 * - Creating documents from email body when no attachment is present
 * - Sending reply emails with thread preservation
 */

'use strict';

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { simpleParser } = require('mailparser');
const EmailProcessingLog = require('../models/EmailProcessingLog');
const User = require('../models/User');
const { processDocument } = require('./documentProcessingService');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const POLL_INTERVAL_MS = Number(process.env.GMAIL_POLL_INTERVAL_MS || 60_000);

let pollTimer = null;
let processing = false;
let oauth2Client = null;

// ═══════════════════════════════════════════════════════════════
// OAUTH 2.0 CLIENT
// ═══════════════════════════════════════════════════════════════

function configured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GMAIL_USER_EMAIL
  );
}

function enabled() {
  return String(process.env.EMAIL_PROCESSING_ENABLED).toLowerCase() === 'true';
}

function getOAuth2Client() {
  if (oauth2Client) return oauth2Client;
  if (!configured()) throw new Error('Gmail API OAuth 2.0 credentials not configured');

  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.access_token) console.log('[Gmail API] Access token refreshed automatically');
  });
  return oauth2Client;
}

function getGmailClient() {
  return google.gmail({ version: 'v1', auth: getOAuth2Client() });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function safeFileName(name) {
  return path.basename(name || 'attachment').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180) || 'attachment';
}

function isSafeEmail(address) {
  return typeof address === 'string'
    && !/[\r\n]/.test(address)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

function replySubject(subject) {
  const clean = String(subject || 'KMRL DocuSense request').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
  return /^re\s*:/i.test(clean) ? clean : `Re: ${clean}`;
}

async function findSystemActor() {
  const actor = await User.findOne({ role: 'Admin', status: 'Active' });
  if (!actor) throw new Error('No active Admin user is available to own email-ingested documents.');
  return actor;
}

// ═══════════════════════════════════════════════════════════════
// GMAIL API - MESSAGE RETRIEVAL
// ═══════════════════════════════════════════════════════════════

/**
 * List unread messages from INBOX only.
 *
 * FIX: Was 'is:unread' which includes Spam, Promotions, Social.
 * Now uses 'is:unread in:inbox' to restrict to INBOX only.
 */
async function listUnreadMessages() {
  const gmail = getGmailClient();
  const userEmail = process.env.GMAIL_USER_EMAIL;

  const response = await gmail.users.messages.list({
    userId: userEmail,
    q: 'is:unread in:inbox',  // INBOX only — excludes Spam, Promotions, Social
    maxResults: 50,
  });

  const messages = response.data.messages || [];

  // Diagnostic: log every message ID found
  console.log(`[Gmail API] Query 'is:unread in:inbox' returned ${messages.length} message(s)`);
  messages.forEach((m, i) => {
    console.log(`[Gmail API]   [${i + 1}] Gmail ID: ${m.id} | Thread: ${m.threadId}`);
  });

  return messages;
}

/**
 * Get full message in raw format.
 *
 * FIX: Gmail API raw format uses URL-safe base64 (- and _).
 * Buffer.from(..., 'base64url') is needed, not 'base64'.
 */
async function getMessage(messageId) {
  const gmail = getGmailClient();
  const userEmail = process.env.GMAIL_USER_EMAIL;

  const response = await gmail.users.messages.get({
    userId: userEmail,
    id: messageId,
    format: 'raw',
  });

  return response.data;
}

/**
 * Mark message as read (remove UNREAD label).
 */
async function markAsRead(gmailId) {
  const gmail = getGmailClient();
  try {
    await gmail.users.messages.modify({
      userId: process.env.GMAIL_USER_EMAIL,
      id: gmailId,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });
  } catch (error) {
    console.error(`[Gmail API] Could not mark ${gmailId} as read:`, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE PROCESSING
// ═══════════════════════════════════════════════════════════════

/**
 * Process a single Gmail message through the full DocuSense pipeline.
 *
 * Behaviour:
 * - If the message has supported attachments → create document(s) from each
 * - If the message has NO supported attachments → create a .txt document
 *   from the email subject + body so it still enters the document pipeline
 *
 * Duplicate prevention:
 * - EmailProcessingLog unique index on messageId prevents double-processing
 * - markAsRead() is called AFTER successful processing (not before)
 */
async function processGmailMessage(gmailMessage) {
  // ── FIX: use base64url decoding, not base64 ──────────────────
  // Gmail API raw field uses URL-safe base64 (replaces + with - and / with _)
  const rawEmail = Buffer.from(gmailMessage.raw, 'base64url').toString('utf8');

  let parsed;
  try {
    parsed = await simpleParser(rawEmail);
  } catch (parseError) {
    console.error(`[Gmail API] Failed to parse message ${gmailMessage.id}:`, parseError.message);
    throw parseError;
  }

  const sender      = parsed.from?.value?.[0]?.address || '';
  const subject     = parsed.subject || '(No subject)';
  const receivedAt  = parsed.date   || new Date();
  const threadId    = gmailMessage.threadId;
  const bodyText    = parsed.text   || parsed.html?.replace(/<[^>]+>/g, ' ') || '';

  // Use Gmail's own message ID as the canonical dedup key (always available)
  const messageId = parsed.messageId
    || `<gmail-${gmailMessage.id}@docusense.local>`;

  // ── Diagnostic: safe summary of this message ─────────────────
  console.log('[Gmail API] ─── MESSAGE DETAILS ───────────────────────');
  console.log(`[Gmail API]   Gmail ID  : ${gmailMessage.id}`);
  console.log(`[Gmail API]   Thread ID : ${threadId}`);
  console.log(`[Gmail API]   Message-ID: ${messageId}`);
  console.log(`[Gmail API]   From      : ${sender}`);
  console.log(`[Gmail API]   Subject   : ${subject}`);
  console.log(`[Gmail API]   Date      : ${receivedAt}`);
  console.log(`[Gmail API]   Body len  : ${bodyText.length} chars`);
  console.log(`[Gmail API]   Attachments: ${(parsed.attachments || []).length}`);
  (parsed.attachments || []).forEach((a, i) => {
    console.log(`[Gmail API]     [${i + 1}] ${a.filename || '(no name)'} | ${a.contentType} | ${a.content?.length || 0} bytes`);
  });
  console.log('[Gmail API] ────────────────────────────────────────────');

  // ── Duplicate check ──────────────────────────────────────────
  let log;
  try {
    log = await EmailProcessingLog.create({
      messageId,
      sender,
      subject,
      receivedAt,
      status: 'RECEIVED',
    });
  } catch (error) {
    if (error?.code === 11000) {
      console.log(`[Gmail API] ⏭  Duplicate — already processed: ${messageId}`);
      // Still mark as read so it doesn't appear again
      await markAsRead(gmailMessage.id);
      return { skipped: true, messageId };
    }
    throw error;
  }

  log.status = 'PROCESSING';
  await log.save();

  const actor   = await findSystemActor();
  const results = [];

  // ── Collect supported attachments ────────────────────────────
  const supportedAttachments = (parsed.attachments || []).filter((a) => {
    const name = safeFileName(a.filename);
    const ext  = path.extname(name).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext) && a.content && a.content.length <= MAX_FILE_SIZE;
  });

  const skippedAttachments = (parsed.attachments || []).filter((a) => {
    const name = safeFileName(a.filename);
    const ext  = path.extname(name).toLowerCase();
    return !SUPPORTED_EXTENSIONS.has(ext) || !a.content || a.content.length > MAX_FILE_SIZE;
  });

  skippedAttachments.forEach((a) => {
    const name   = safeFileName(a.filename);
    const ext    = path.extname(name).toLowerCase();
    const reason = !SUPPORTED_EXTENSIONS.has(ext)
      ? `Unsupported type: ${ext || '(none)'}`
      : 'Exceeds 10MB or empty';
    results.push({ name, result: 'SKIPPED', reason });
    console.info(`[Gmail API] ${messageId}: attachment skipped — ${name} (${reason})`);
  });

  const destination = path.join(__dirname, '..', 'uploads', 'email');
  await fs.promises.mkdir(destination, { recursive: true });

  if (supportedAttachments.length > 0) {
    // ── Path A: process each supported attachment ─────────────
    console.log(`[Gmail API] ${messageId}: processing ${supportedAttachments.length} attachment(s)`);

    for (const attachment of supportedAttachments) {
      const name       = safeFileName(attachment.filename);
      const storedPath = path.join(destination, `${Date.now()}-${crypto.randomUUID()}-${name}`);

      try {
        await fs.promises.writeFile(storedPath, attachment.content, { flag: 'wx' });

        const result = await processDocument({
          filePath:          storedPath,
          originalFileName:  name,
          fileSize:          attachment.content.length,
          title:             subject === '(No subject)' ? name : `${subject} — ${name}`,
          uploadedBy:        actor,
          source:            'email',
          emailMetadata:     { messageId, sender, subject, receivedAt, threadId },
        });

        if (result.duplicate) {
          await fs.promises.unlink(storedPath).catch(() => {});
          results.push({
            name,
            result:     'DUPLICATE',
            reason:     'Document with this SHA-256 hash already exists',
            documentId: result.document?._id,
          });
          console.info(`[Gmail API] ${messageId}: duplicate attachment — ${name}`);
        } else {
          results.push({ name, result: 'PROCESSED', documentId: result.document._id });
          console.info(`[Gmail API] ${messageId}: attachment processed — ${name} → doc ${result.document._id}`);
        }
      } catch (error) {
        results.push({ name, result: 'FAILED', reason: error.message.slice(0, 500) });
        console.error(`[Gmail API] ${messageId}: attachment failed — ${name}:`, error.message);
      }
    }
  } else {
    // ── Path B: no supported attachment — create .txt from body ──
    // FIX: was silently SKIPPED; now creates a document from the email body
    // so the email still enters the classification/ticket pipeline.
    console.log(`[Gmail API] ${messageId}: no supported attachments — creating document from email body`);

    const bodyContent = [
      `From: ${sender}`,
      `Subject: ${subject}`,
      `Date: ${receivedAt.toISOString()}`,
      '',
      bodyText || '(no body)',
    ].join('\n');

    const fileName   = safeFileName(`${subject}.txt`);
    const storedPath = path.join(destination, `${Date.now()}-${crypto.randomUUID()}-${fileName}`);

    try {
      await fs.promises.writeFile(storedPath, bodyContent, { flag: 'wx', encoding: 'utf8' });

      const result = await processDocument({
        filePath:         storedPath,
        originalFileName: fileName,
        fileSize:         Buffer.byteLength(bodyContent, 'utf8'),
        title:            subject === '(No subject)' ? `Email from ${sender}` : subject,
        uploadedBy:       actor,
        source:           'email',
        emailMetadata:    { messageId, sender, subject, receivedAt, threadId },
      });

      if (result.duplicate) {
        await fs.promises.unlink(storedPath).catch(() => {});
        results.push({
          name:       fileName,
          result:     'DUPLICATE',
          reason:     'Document with this SHA-256 hash already exists',
          documentId: result.document?._id,
        });
        console.info(`[Gmail API] ${messageId}: body document duplicate`);
      } else {
        results.push({ name: fileName, result: 'PROCESSED', documentId: result.document._id });
        console.info(`[Gmail API] ${messageId}: body document created → doc ${result.document._id}`);
      }
    } catch (error) {
      results.push({ name: fileName, result: 'FAILED', reason: error.message.slice(0, 500) });
      console.error(`[Gmail API] ${messageId}: body document failed:`, error.message);
    }
  }

  // ── Persist processing result ────────────────────────────────
  log.attachments = results;
  log.status = results.some((r) => r.result === 'PROCESSED') ? 'PROCESSED'
    : results.some((r) => r.result === 'FAILED')    ? 'FAILED'
    :                                                  'SKIPPED';
  await log.save();
  console.info(`[Gmail API] ${messageId}: final status → ${log.status}`);

  // ── FIX: mark as read AFTER processing, not before ───────────
  await markAsRead(gmailMessage.id);

  return { skipped: false, messageId, threadId, status: log.status };
}

// ═══════════════════════════════════════════════════════════════
// POLL LOOP
// ═══════════════════════════════════════════════════════════════

async function pollUnreadMessages() {
  if (processing) {
    console.log('[Gmail API] Already processing — skipping this poll cycle');
    return;
  }

  processing = true;
  console.log('[Gmail API] 📬 Polling for unread messages...');

  try {
    const messages = await listUnreadMessages();

    if (!messages || messages.length === 0) {
      console.log('[Gmail API] No unread messages in INBOX');
      return;
    }

    console.log(`[Gmail API] Processing ${messages.length} message(s)...`);

    for (const message of messages) {
      try {
        const fullMessage = await getMessage(message.id);
        await processGmailMessage(fullMessage);
      } catch (error) {
        console.error(`[Gmail API] Failed to process message ${message.id}:`, error.message);
        // Continue with remaining messages
      }
    }

    console.log(`[Gmail API] ✅ Finished processing ${messages.length} message(s)`);
  } catch (error) {
    console.error('[Gmail API] ❌ Error polling messages:', error.message);
  } finally {
    processing = false;
  }
}

function schedulePoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    pollUnreadMessages()
      .catch((err) => console.error('[Gmail API] Poll error:', err.message))
      .finally(schedulePoll);
  }, POLL_INTERVAL_MS);
}

// ═══════════════════════════════════════════════════════════════
// RESOLUTION EMAIL SENDING
// ═══════════════════════════════════════════════════════════════

function buildResolutionText(ticket, document) {
  const resolvedAt = ticket.resolvedAt || new Date();
  const date = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(resolvedAt);

  return [
    'Dear Sir/Madam,',
    '',
    `Your request has been reviewed by the KMRL ${ticket.department} Department.`,
    '',
    'Resolution:',
    ticket.resolutionMessage,
    '',
    `Ticket ID: ${ticket.ticketId}`,
    'Status: Resolved',
    `Resolved by: ${ticket.department} Department`,
    `Resolved on: ${date}`,
    '',
    'Regards,',
    'KMRL DocuSense',
    'Kochi Metro Rail Limited',
  ].join('\n');
}

function createEmailMessage(to, subject, body, threadId = null, references = null) {
  const from = process.env.GMAIL_USER_EMAIL;
  const parts = [
    `From: KMRL DocuSense <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ];
  if (references) {
    parts.push(`References: ${references}`);
    parts.push(`In-Reply-To: ${references}`);
  }
  parts.push('', body);
  const raw = parts.join('\r\n');
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendResolutionEmail(ticket) {
  const document = ticket.documentId && typeof ticket.documentId === 'object'
    ? ticket.documentId : null;
  const sender = document?.emailSender;

  if (!document || document.source !== 'email') return { skipped: true, reason: 'not_email_ticket' };
  if (!isSafeEmail(sender)) throw new Error('A valid original sender is not available for this email ticket.');
  if (!ticket.resolutionMessage?.trim()) throw new Error('A resolution message is required before sending email.');

  const gmail      = getGmailClient();
  const userEmail  = process.env.GMAIL_USER_EMAIL;
  const subject    = replySubject(document.emailSubject);
  const body       = buildResolutionText(ticket, document);
  const threadId   = document.emailMetadata?.threadId;
  const messageId  = document.emailMessageId;

  const requestBody = {
    raw: createEmailMessage(sender, subject, body, threadId, messageId),
  };
  if (threadId) requestBody.threadId = threadId;

  const response = await gmail.users.messages.send({ userId: userEmail, requestBody });

  const masked = sender.replace(/(^.).*(@.*$)/, '$1***$2');
  console.info(
    `[Gmail API] Resolution email sent | ticket=${ticket.ticketId} | ` +
    `recipient=${masked} | gmailId=${response.data.id} | ` +
    `threadId=${response.data.threadId || 'N/A'} | at=${new Date().toISOString()}`
  );

  return { sent: true, messageId: response.data.id, threadId: response.data.threadId };
}

// ═══════════════════════════════════════════════════════════════
// SERVICE LIFECYCLE
// ═══════════════════════════════════════════════════════════════

async function startGmailService() {
  console.log('');
  console.log('GMAIL API STARTUP CHECK:');
  console.log('  CLIENT_ID:     ', process.env.GOOGLE_CLIENT_ID    ? '[SET]' : '❌ NOT SET');
  console.log('  CLIENT_SECRET: ', process.env.GOOGLE_CLIENT_SECRET ? '[SET]' : '❌ NOT SET');
  console.log('  REFRESH_TOKEN: ', process.env.GOOGLE_REFRESH_TOKEN ? '[SET]' : '❌ NOT SET');
  console.log('  USER_EMAIL:    ', process.env.GMAIL_USER_EMAIL     || '❌ NOT SET');
  console.log('  POLL_INTERVAL: ', `${POLL_INTERVAL_MS / 1000}s`);
  console.log('');

  if (!enabled()) {
    console.info('[Gmail API] Email processing disabled (EMAIL_PROCESSING_ENABLED is not true).');
    return;
  }
  if (!configured()) {
    console.error('[Gmail API] OAuth 2.0 configuration incomplete. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GMAIL_USER_EMAIL');
    return;
  }

  try {
    console.log('[Gmail API] 🔐 Testing OAuth 2.0 authentication...');
    const tokenInfo = await getOAuth2Client().getAccessToken();
    if (!tokenInfo.token) throw new Error('Failed to obtain access token');
    console.log('[Gmail API] ✅ OAuth 2.0 authentication successful!');

    console.log('[Gmail API] 📬 Running initial message poll...');
    await pollUnreadMessages();
    schedulePoll();
    console.log('[Gmail API] ✅ Gmail API service is now active and polling for new emails.');
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ GMAIL API CONNECTION FAILED');
    console.error('Error:', error.message);
    console.error('Run: node scripts/setupGmailOAuth.js to re-authenticate');
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
  }
}

function stopGmailService() {
  clearTimeout(pollTimer);
  pollTimer = null;
  console.log('[Gmail API] Service stopped');
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  startGmailService,
  stopGmailService,
  sendResolutionEmail,
  getOAuth2Client,
  getGmailClient,
  pollUnreadMessages,
  processGmailMessage,
};
