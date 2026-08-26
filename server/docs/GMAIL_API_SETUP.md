# Gmail API + OAuth 2.0 Setup Guide

This guide explains how to set up Gmail API with OAuth 2.0 authentication for KMRL DocuSense email ingestion and resolution workflows.

---

## 📋 Overview

KMRL DocuSense uses **Gmail API + OAuth 2.0** instead of IMAP/SMTP for:
- **Incoming emails**: Poll Gmail for unread messages, download attachments, create documents and tickets
- **Resolution emails**: Send replies to original senders when tickets are resolved

### Why Gmail API instead of IMAP/SMTP?

- ✅ **More reliable**: No App Password authentication issues
- ✅ **Better security**: OAuth 2.0 with automatic token refresh
- ✅ **Thread preservation**: Replies appear in original conversation
- ✅ **Free for development**: No paid email service required
- ✅ **Official Google API**: Better support and stability

---

## 🚀 Prerequisites

- Gmail account: `testhari2006@gmail.com` (or your development account)
- Google account with access to Google Cloud Console
- Node.js and npm installed

---

## 📝 Step-by-Step Setup

### **Step 1: Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** dropdown → **"New Project"**
3. Enter project details:
   - **Project name**: `KMRL DocuSense` (or any name)
   - **Organization**: Leave blank or select your organization
4. Click **"Create"**
5. Wait for project creation (takes ~30 seconds)
6. Select the newly created project from the dropdown

---

### **Step 2: Enable Gmail API**

1. In the Google Cloud Console, navigate to **"APIs & Services"** → **"Library"**
   - Or direct link: https://console.cloud.google.com/apis/library
2. Search for **"Gmail API"**
3. Click on **"Gmail API"** from the results
4. Click **"Enable"** button
5. Wait for API to be enabled (~10 seconds)

---

### **Step 3: Configure OAuth Consent Screen**

1. Navigate to **"APIs & Services"** → **"OAuth consent screen"**
   - Or direct link: https://console.cloud.google.com/apis/credentials/consent
2. Choose user type:
   - **External** (for personal Gmail accounts)
   - **Internal** (for Google Workspace accounts only)
3. Click **"Create"**

#### **OAuth Consent Screen Configuration**

Fill in the following fields:

**App information:**
- **App name**: `KMRL DocuSense`
- **User support email**: Your Gmail address (e.g., `testhari2006@gmail.com`)
- **App logo**: (Optional) Upload logo if available

**App domain:**
- **Application home page**: `http://localhost:5000` (for development)
- **Application privacy policy link**: (Optional for development)
- **Application terms of service link**: (Optional for development)

**Developer contact information:**
- **Email addresses**: Your Gmail address (e.g., `testhari2006@gmail.com`)

4. Click **"Save and Continue"**

#### **Scopes**

5. Click **"Add or Remove Scopes"**
6. Search and select the following scopes:
   - ✅ `https://www.googleapis.com/auth/gmail.readonly` - Read emails
   - ✅ `https://www.googleapis.com/auth/gmail.send` - Send emails
   - ✅ `https://www.googleapis.com/auth/gmail.modify` - Modify labels (mark as read)
7. Click **"Update"**
8. Click **"Save and Continue"**

#### **Test Users** (for External apps)

9. Click **"Add Users"**
10. Enter your Gmail address: `testhari2006@gmail.com`
11. Click **"Add"**
12. Click **"Save and Continue"**

13. Review the summary and click **"Back to Dashboard"**

---

### **Step 4: Create OAuth 2.0 Credentials**

1. Navigate to **"APIs & Services"** → **"Credentials"**
   - Or direct link: https://console.cloud.google.com/apis/credentials
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Configure OAuth client:
   - **Application type**: `Web application`
   - **Name**: `KMRL DocuSense Web Client`
   
4. **Authorized redirect URIs**:
   - Click **"+ Add URI"**
   - Enter: `http://localhost:5000/auth/google/callback`
   - For production, add your production URL (e.g., `https://yourdomain.com/auth/google/callback`)

5. Click **"Create"**

6. **Download credentials**:
   - A dialog appears with your Client ID and Client Secret
   - **Copy** the **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
   - **Copy** the **Client Secret** (looks like: `GOCSPX-abcd1234efgh5678`)
   - ⚠️ **IMPORTANT**: Keep these secret! Never commit to Git.

---

### **Step 5: Configure Environment Variables**

1. Open `server/.env` file
2. Add the OAuth credentials you just copied:

```env
# Gmail API OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234efgh5678
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_REFRESH_TOKEN=
GMAIL_USER_EMAIL=testhari2006@gmail.com
EMAIL_PROCESSING_ENABLED=true
```

3. Save the file

⚠️ **Note**: `GOOGLE_REFRESH_TOKEN` is empty for now. We'll generate it in the next step.

---

### **Step 6: Run OAuth Setup Utility**

This script will:
1. Generate an authorization URL
2. Open your browser for Google authorization
3. Receive the OAuth callback
4. Exchange authorization code for refresh token
5. Display the token to add to your `.env` file

**Run the setup script:**

```bash
cd server
node scripts/setupGmailOAuth.js
```

**What happens:**

1. The script opens your browser automatically
2. You see Google's authorization screen
3. **Sign in** with: `testhari2006@gmail.com`
4. **Review permissions**:
   - ✅ Read emails
   - ✅ Send emails
   - ✅ Modify labels
5. Click **"Allow"**
6. You're redirected back to `http://localhost:5000/auth/google/callback`
7. The script displays your credentials in the terminal

**Expected output:**

```
═══════════════════════════════════════════════════════
  ✅ OAUTH 2.0 SETUP SUCCESSFUL!
═══════════════════════════════════════════════════════

Add these to your .env file:

─────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234efgh5678
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_REFRESH_TOKEN=1//0gAbCdEfGhIjKlMnOpQrStUvWxYz...
GMAIL_USER_EMAIL=testhari2006@gmail.com
EMAIL_PROCESSING_ENABLED=true
─────────────────────────────────────────────────────
```

8. **Copy the `GOOGLE_REFRESH_TOKEN`** value and add it to your `.env` file:

```env
GOOGLE_REFRESH_TOKEN=1//0gAbCdEfGhIjKlMnOpQrStUvWxYz...
```

9. Save the `.env` file

---

### **Step 7: Verify Configuration**

Check that your `.env` file has all required variables:

```env
# Gmail API OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234efgh5678
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_REFRESH_TOKEN=1//0gAbCdEfGhIjKlMnOpQrStUvWxYz...
GMAIL_USER_EMAIL=testhari2006@gmail.com
EMAIL_PROCESSING_ENABLED=true
```

✅ All variables should be filled (not empty)

---

### **Step 8: Start the Server**

```bash
npm start
```

**Expected startup logs:**

```
GMAIL API STARTUP CHECK:
  CLIENT_ID: [SET]
  CLIENT_SECRET: [SET]
  REFRESH_TOKEN: [SET]
  USER_EMAIL: testhari2006@gmail.com
  POLL_INTERVAL: 60s

[Gmail API] 🔐 Testing OAuth 2.0 authentication...
[Gmail API] ✅ OAuth 2.0 authentication successful!
[Gmail API] 📬 Running initial message poll...
[Gmail API] No unread messages found
[Gmail API] ✅ Gmail API service is now active and polling for new emails.
```

✅ If you see these logs, Gmail API is configured correctly!

---

## 🧪 Testing the Integration

### **Test 1: Incoming Email**

1. **Send a test email** FROM another email address TO `testhari2006@gmail.com`
2. **Subject**: `Test Safety Inspection Request`
3. **Body**: Any text
4. **Attach**: A PDF file (e.g., sample document)
5. Wait up to 1 minute (default poll interval)

**Expected result:**

```
[Gmail API] 📬 Polling for unread messages...
[Gmail API] Found 1 unread message(s)
[Gmail API] 📧 Processing message ID: 18f1234abcd5678
[Gmail API] <email-id>: PROCESSED
[Gmail API] ✅ Finished processing 1 message(s)
```

6. **Verify**:
   - Document created: Check `/api/documents`
   - Ticket created: Check `/api/tickets`
   - Email marked as read in Gmail

### **Test 2: Resolution Email**

1. **Log in** as a Department Officer
2. **Navigate** to the ticket created from email
3. **Resolve** the ticket:
   - Enter resolution message: `Inspection completed. All safety measures verified.`
   - Click **"Resolve"**

**Expected result:**

```
[Gmail API] Resolution email sent | ticket=KMRL-2024-00123 | 
recipient=t***@gmail.com | messageId=18f5678abcd1234 | 
threadId=18f1234abcd5678 | at=2024-08-23T...
```

4. **Verify**:
   - Original sender receives email reply
   - Reply appears in the same Gmail conversation thread
   - Ticket status is "Resolved"

---

## 🔧 Troubleshooting

### **Issue: "OAuth 2.0 configuration incomplete"**

**Cause**: Missing environment variables

**Solution**:
1. Check `.env` file has all required variables
2. Ensure no empty values
3. Restart server after updating `.env`

---

### **Issue: "Failed to obtain access token"**

**Cause**: Invalid or expired refresh token

**Solution**:
1. Go to https://myaccount.google.com/permissions
2. Remove "KMRL DocuSense" access
3. Run `node scripts/setupGmailOAuth.js` again
4. Copy new `GOOGLE_REFRESH_TOKEN` to `.env`
5. Restart server

---

### **Issue: "No refresh token received"**

**Cause**: Already authorized the app before

**Solution**:
1. Go to https://myaccount.google.com/permissions
2. Find "KMRL DocuSense" and click it
3. Click **"Remove access"**
4. Run `node scripts/setupGmailOAuth.js` again
5. The script will now receive a refresh token

---

### **Issue: "Access blocked: This app hasn't been verified"**

**Cause**: OAuth consent screen is not verified (normal for development)

**Solution**:
1. On the Google authorization screen, click **"Advanced"**
2. Click **"Go to KMRL DocuSense (unsafe)"**
3. This is safe for your own development project
4. For production, submit app for verification

---

### **Issue: "Error: redirect_uri_mismatch"**

**Cause**: Redirect URI in OAuth credentials doesn't match

**Solution**:
1. Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth client ID
3. Under "Authorized redirect URIs", ensure it has:
   ```
   http://localhost:5000/auth/google/callback
   ```
4. Click **"Save"**
5. Wait 5 minutes for changes to propagate
6. Run setup script again

---

### **Issue: Gmail API not polling**

**Cause**: `EMAIL_PROCESSING_ENABLED` is false

**Solution**:
1. Open `.env` file
2. Set: `EMAIL_PROCESSING_ENABLED=true`
3. Restart server

---

### **Issue: "IMAP connection failed" error still appears**

**Cause**: Old IMAP code is still being called

**Solution**:
1. Check `server/index.js` imports `startGmailService` (not `startEmailService`)
2. Check `server/controllers/ticketController.js` imports from `gmailService` (not `emailService`)
3. Restart server

---

## 🔒 Security Best Practices

### **1. Never commit credentials**

Ensure `.gitignore` includes:
```
.env
.env.*
credentials.json
token.json
```

### **2. Use different credentials for production**

- Development: `http://localhost:5000/auth/google/callback`
- Production: `https://yourdomain.com/auth/google/callback`

Create separate OAuth clients for each environment.

### **3. Rotate credentials periodically**

- Generate new Client Secret every 6 months
- Revoke and regenerate refresh tokens annually

### **4. Monitor OAuth access**

Check authorized apps: https://myaccount.google.com/permissions

Remove any suspicious or unused access.

---

## 📊 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | ✅ Yes | OAuth 2.0 Client ID from Google Cloud | `123456...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ✅ Yes | OAuth 2.0 Client Secret | `GOCSPX-abcd1234...` |
| `GOOGLE_REDIRECT_URI` | ✅ Yes | OAuth callback URL | `http://localhost:5000/auth/google/callback` |
| `GOOGLE_REFRESH_TOKEN` | ✅ Yes | Refresh token from setup script | `1//0gAbCdEf...` |
| `GMAIL_USER_EMAIL` | ✅ Yes | Gmail account for email processing | `testhari2006@gmail.com` |
| `EMAIL_PROCESSING_ENABLED` | ✅ Yes | Enable/disable email ingestion | `true` or `false` |
| `GMAIL_POLL_INTERVAL_MS` | ❌ No | Polling interval (default: 60000ms) | `60000` (1 minute) |
| `EMAIL_RETRY_INTERVAL_MS` | ❌ No | Retry interval on failure | `300000` (5 minutes) |

---

## 📚 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Gmail API Node.js Client](https://github.com/googleapis/google-api-nodejs-client)

---

## ❓ FAQ

**Q: Is Gmail API free?**  
A: Yes, Gmail API has generous free quotas suitable for development and small-scale production use.

**Q: Can I use multiple Gmail accounts?**  
A: Yes, but you need separate OAuth credentials for each account. Set them in environment variables.

**Q: Does this work with Google Workspace (G Suite)?**  
A: Yes! Use "Internal" OAuth consent screen type for Workspace accounts.

**Q: How often does it poll for new emails?**  
A: Default is 60 seconds (1 minute). Configure with `GMAIL_POLL_INTERVAL_MS`.

**Q: What happens if OAuth fails?**  
A: The service logs an error and retries after `EMAIL_RETRY_INTERVAL_MS` (default: 5 minutes).

**Q: Can I test without a real Gmail account?**  
A: No, you need a real Gmail account. But you can use a free personal Gmail account for testing.

---

## 🎉 Setup Complete!

You have successfully configured Gmail API + OAuth 2.0 for KMRL DocuSense.

**Next steps:**
1. Send a test email to verify incoming email processing
2. Resolve a ticket to verify resolution email sending
3. Monitor logs for any errors
4. For production, create separate OAuth credentials

**Need help?** Check the troubleshooting section above or review server logs for detailed error messages.
