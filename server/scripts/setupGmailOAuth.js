/**
 * KMRL DocuSense - Gmail OAuth 2.0 Setup Utility
 * 
 * This script helps developers set up Gmail API OAuth 2.0 authentication.
 * 
 * Steps:
 * 1. Generates Google OAuth authorization URL
 * 2. Developer authorizes the app in browser
 * 3. Receives authorization code via callback
 * 4. Exchanges code for refresh token
 * 5. Displays tokens to add to .env
 * 
 * Usage:
 *   node scripts/setupGmailOAuth.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const express = require('express');
const open = require('open');

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  KMRL DOCUSENSE - GMAIL OAUTH 2.0 SETUP');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION CHECK
// ═══════════════════════════════════════════════════════════════

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ Missing OAuth credentials in .env file!');
  console.error('');
  console.error('Required environment variables:');
  console.error('  GOOGLE_CLIENT_ID=<your-client-id>');
  console.error('  GOOGLE_CLIENT_SECRET=<your-client-secret>');
  console.error('  GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback');
  console.error('');
  console.error('Steps to obtain credentials:');
  console.error('  1. Go to: https://console.cloud.google.com/');
  console.error('  2. Create a project (or select existing)');
  console.error('  3. Enable Gmail API');
  console.error('  4. Create OAuth 2.0 credentials');
  console.error('  5. Add redirect URI: http://localhost:5000/auth/google/callback');
  console.error('  6. Copy Client ID and Client Secret to .env');
  console.error('');
  process.exit(1);
}

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback';
const PORT = 5000;

// Gmail API scopes needed
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',  // Read emails
  'https://www.googleapis.com/auth/gmail.send',      // Send emails
  'https://www.googleapis.com/auth/gmail.modify',    // Modify labels (mark as read)
];

// ═══════════════════════════════════════════════════════════════
// OAUTH CLIENT
// ═══════════════════════════════════════════════════════════════

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// ═══════════════════════════════════════════════════════════════
// AUTHORIZATION FLOW
// ═══════════════════════════════════════════════════════════════

function generateAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Get refresh token
    prompt: 'consent',       // Force consent screen to get refresh token
    scope: SCOPES,
  });
}

async function exchangeCodeForTokens(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    throw new Error(`Failed to exchange code for tokens: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPRESS SERVER FOR CALLBACK
// ═══════════════════════════════════════════════════════════════

const app = express();
let server = null;

app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('');
    console.error('❌ Authorization failed:', error);
    res.send('<h1>Authorization Failed</h1><p>Check the console for details.</p>');
    setTimeout(() => process.exit(1), 2000);
    return;
  }

  if (!code) {
    console.error('');
    console.error('❌ No authorization code received');
    res.send('<h1>Error</h1><p>No authorization code received.</p>');
    setTimeout(() => process.exit(1), 2000);
    return;
  }

  console.log('');
  console.log('✅ Authorization code received!');
  console.log('🔄 Exchanging code for tokens...');
  console.log('');

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      console.warn('⚠️  WARNING: No refresh token received!');
      console.warn('   This can happen if you\'ve already authorized this app.');
      console.warn('   To get a refresh token:');
      console.warn('   1. Go to: https://myaccount.google.com/permissions');
      console.warn('   2. Remove this app\'s access');
      console.warn('   3. Run this script again');
      console.warn('');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✅ OAUTH 2.0 SETUP SUCCESSFUL!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Add these to your .env file:');
    console.log('');
    console.log('─────────────────────────────────────────────────────');
    console.log('GOOGLE_CLIENT_ID=' + process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET=' + process.env.GOOGLE_CLIENT_SECRET);
    console.log('GOOGLE_REDIRECT_URI=' + REDIRECT_URI);
    if (tokens.refresh_token) {
      console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    } else {
      console.log('# GOOGLE_REFRESH_TOKEN=<revoke access and re-run>');
    }
    console.log('GMAIL_USER_EMAIL=testhari2006@gmail.com');
    console.log('EMAIL_PROCESSING_ENABLED=true');
    console.log('─────────────────────────────────────────────────────');
    console.log('');
    console.log('Token Information:');
    console.log('  Access Token: ' + (tokens.access_token ? '[RECEIVED]' : '[NOT RECEIVED]'));
    console.log('  Refresh Token: ' + (tokens.refresh_token ? '[RECEIVED]' : '⚠️  [NOT RECEIVED - See warning above]'));
    console.log('  Expires In: ' + (tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A'));
    console.log('');
    console.log('Granted Scopes:');
    SCOPES.forEach((scope) => {
      console.log('  ✓', scope);
    });
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Copy the environment variables above to your .env file');
    console.log('  2. Restart your server: npm start');
    console.log('  3. Gmail API will automatically authenticate using the refresh token');
    console.log('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail OAuth Setup - Success</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h1 {
            color: #28a745;
            margin-top: 0;
          }
          .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .code {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
            overflow-x: auto;
            white-space: pre;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ OAuth 2.0 Setup Successful!</h1>
          <div class="success">
            <strong>Authorization Complete</strong><br>
            Your Gmail API credentials have been generated successfully.
          </div>
          ${!tokens.refresh_token ? `
          <div class="warning">
            <strong>⚠️ No Refresh Token Received</strong><br>
            This happens if you've previously authorized this app. To get a refresh token:
            <ol>
              <li>Go to <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a></li>
              <li>Remove "KMRL DocuSense" access</li>
              <li>Run this setup script again</li>
            </ol>
          </div>
          ` : ''}
          <h2>Environment Variables</h2>
          <p>Check your console for the complete .env configuration.</p>
          <p>You can close this window and return to the terminal.</p>
        </div>
      </body>
      </html>
    `);

    // Close server after 5 seconds
    setTimeout(() => {
      if (server) {
        server.close(() => {
          console.log('Setup complete. You can now close this terminal or press Ctrl+C.');
          process.exit(0);
        });
      }
    }, 5000);

  } catch (error) {
    console.error('');
    console.error('❌ Error exchanging code for tokens:', error.message);
    console.error('');
    res.send(`<h1>Error</h1><p>${error.message}</p>`);
    setTimeout(() => process.exit(1), 2000);
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('<h1>Gmail OAuth Setup Server</h1><p>Waiting for authorization callback...</p>');
});

// ═══════════════════════════════════════════════════════════════
// MAIN SETUP FLOW
// ═══════════════════════════════════════════════════════════════

async function startSetup() {
  console.log('CONFIGURATION:');
  console.log('  Client ID: ' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...');
  console.log('  Client Secret: [SET]');
  console.log('  Redirect URI: ' + REDIRECT_URI);
  console.log('');
  console.log('REQUIRED SCOPES:');
  SCOPES.forEach((scope) => {
    console.log('  •', scope);
  });
  console.log('');

  // Start callback server
  server = app.listen(PORT, () => {
    console.log(`✅ Callback server running on http://localhost:${PORT}`);
    console.log('');
  });

  // Generate auth URL
  const authUrl = generateAuthUrl();
  console.log('═══════════════════════════════════════════════════════');
  console.log('  AUTHORIZATION REQUIRED');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('1. Opening browser for Google authorization...');
  console.log('');
  console.log('   If browser doesn\'t open, manually visit:');
  console.log('');
  console.log('   ' + authUrl);
  console.log('');
  console.log('2. Sign in with: testhari2006@gmail.com');
  console.log('');
  console.log('3. Grant the following permissions:');
  console.log('   • Read emails');
  console.log('   • Send emails');
  console.log('   • Modify labels');
  console.log('');
  console.log('4. You will be redirected back to this script automatically');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Open browser
  setTimeout(async () => {
    try {
      await open(authUrl);
      console.log('✅ Browser opened');
      console.log('');
      console.log('⏳ Waiting for authorization...');
      console.log('');
    } catch (error) {
      console.warn('⚠️  Could not open browser automatically');
      console.warn('   Please manually open the URL above');
      console.log('');
    }
  }, 1000);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('');
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Start setup
startSetup().catch((error) => {
  console.error('');
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});
