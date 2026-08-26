# Gmail API Testing Checklist

This document provides step-by-step testing procedures for the Gmail API + OAuth 2.0 integration.

---

## ✅ Pre-Testing Validation

Before starting tests, run the validation script:

```bash
cd server
node scripts/validateGmailSetup.js
```

**Expected output:**
```
✅ ALL CHECKS PASSED!
```

If you see errors, fix them before proceeding to tests.

---

## 🧪 Test Suite

### **TEST 1: OAuth Authentication Flow** ✓

**Objective**: Verify that OAuth 2.0 setup works correctly

**Prerequisites**:
- Google Cloud project created
- Gmail API enabled
- OAuth 2.0 credentials created
- Environment variables configured (CLIENT_ID, CLIENT_SECRET)

**Steps**:

1. **Run OAuth setup script:**
   ```bash
   node scripts/setupGmailOAuth.js
   ```

2. **Verify browser opens automatically**
   - Should open: `https://accounts.google.com/o/oauth2/v2/auth?...`
   - If browser doesn't open, copy URL from terminal and paste in browser

3. **Sign in with test account:**
   - Account: `testhari2006@gmail.com`
   - Enter password

4. **Review permissions screen:**
   - Should show: "KMRL DocuSense wants to access your Google Account"
   - Required permissions:
     - ✅ Read emails
     - ✅ Send emails  
     - ✅ Modify labels

5. **Click "Allow"**

6. **Verify redirect:**
   - Redirects to: `http://localhost:5000/auth/google/callback?code=...`
   - Browser shows: "✅ OAuth 2.0 Setup Successful!"

7. **Check terminal output:**
   ```
   ✅ Authorization code received!
   🔄 Exchanging code for tokens...
   
   ═══════════════════════════════════════════════════════
     ✅ OAUTH 2.0 SETUP SUCCESSFUL!
   ═══════════════════════════════════════════════════════
   
   GOOGLE_REFRESH_TOKEN=1//0g...
   ```

8. **Copy refresh token to .env:**
   - Open `server/.env`
   - Update: `GOOGLE_REFRESH_TOKEN=1//0g...`
   - Save file

**Expected Result**: ✅ PASS
- Refresh token generated
- Token added to .env
- No errors in terminal

**If Failed**:
- Check Google Cloud OAuth credentials
- Verify redirect URI matches: `http://localhost:5000/auth/google/callback`
- Check OAuth consent screen is configured
- See troubleshooting in GMAIL_API_SETUP.md

---

### **TEST 2: Server Startup with Gmail API** ✓

**Objective**: Verify server starts successfully with Gmail API

**Prerequisites**:
- TEST 1 passed
- GOOGLE_REFRESH_TOKEN in .env
- EMAIL_PROCESSING_ENABLED=true

**Steps**:

1. **Start server:**
   ```bash
   npm start
   ```

2. **Check startup logs:**

**Expected logs:**
```
┌─────────────────────────────────────────┐
│        KMRL DocuSense API Server         │
├─────────────────────────────────────────┤
│  🚀  Listening on   http://localhost:5000  │
│  🌍  Environment    development          │
└─────────────────────────────────────────┘

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

**Expected Result**: ✅ PASS
- Server starts without errors
- OAuth authentication successful
- Gmail API polling started
- No IMAP errors

**If Failed**:
- Check .env has all required variables
- Verify refresh token is valid
- Check Gmail API is enabled in Google Cloud
- See server error logs for details

---

### **TEST 3: Incoming Email Processing (End-to-End)** ✓

**Objective**: Verify complete email → document → ticket workflow

**Prerequisites**:
- TEST 2 passed
- Server running
- Another email account for sending test email

**Steps**:

1. **Prepare test PDF:**
   - Create or download a sample PDF file
   - File should be < 10MB
   - Example: safety_inspection_report.pdf

2. **Send test email:**
   - **From**: Your personal email (NOT testhari2006@gmail.com)
   - **To**: testhari2006@gmail.com
   - **Subject**: `Test Safety Inspection Request`
   - **Body**: 
     ```
     Please review the attached safety inspection report.
     
     Location: Station A
     Date: 2024-08-23
     Priority: High
     ```
   - **Attachment**: safety_inspection_report.pdf
   - Click **Send**

3. **Wait for polling cycle:**
   - Default poll interval: 60 seconds
   - Watch server logs

4. **Check server logs:**

**Expected logs:**
```
[Gmail API] 📬 Polling for unread messages...
[Gmail API] Found 1 unread message(s)
[Gmail API] 📧 Processing message ID: 18f1234abcd5678
[Gmail API] <email-message-id>: PROCESSED
[Gmail API] ✅ Finished processing 1 message(s)
```

5. **Verify document created:**
   ```bash
   # API request
   GET http://localhost:5000/api/documents
   ```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Test Safety Inspection Request — safety_inspection_report.pdf",
      "source": "email",
      "emailSender": "your-email@example.com",
      "emailSubject": "Test Safety Inspection Request",
      "status": "Routed",
      "department": "Safety",
      ...
    }
  ]
}
```

6. **Verify ticket created:**
   ```bash
   # API request
   GET http://localhost:5000/api/tickets
   ```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "ticketId": "KMRL-2024-00001",
      "department": "Safety",
      "status": "New",
      "resolutionEmailStatus": "not_required",
      ...
    }
  ]
}
```

7. **Verify email marked as read:**
   - Check Gmail web interface
   - Email should no longer have "unread" badge

**Expected Result**: ✅ PASS
- Email detected by Gmail API
- Attachment downloaded
- Document created in database
- AI processing completed
- Department classified (Safety)
- Ticket created
- Email marked as read

**If Failed**:
- Check EMAIL_PROCESSING_ENABLED=true
- Verify Gmail API permissions granted
- Check attachment is supported format (.pdf, .docx, .txt)
- Check attachment size < 10MB
- See server error logs

---

### **TEST 4: Duplicate Email Prevention** ✓

**Objective**: Verify duplicate emails are skipped

**Prerequisites**:
- TEST 3 passed
- Original test email still in Gmail

**Steps**:

1. **Mark test email as unread again:**
   - Go to Gmail web interface
   - Find the test email
   - Click "Mark as unread"

2. **Wait for next polling cycle:**
   - Watch server logs

**Expected logs:**
```
[Gmail API] 📬 Polling for unread messages...
[Gmail API] Found 1 unread message(s)
[Gmail API] 📧 Processing message ID: 18f1234abcd5678
[Gmail API] Skipping duplicate message: <email-message-id>
```

3. **Verify no new document created:**
   ```bash
   GET http://localhost:5000/api/documents
   ```
   - Document count should NOT increase

4. **Verify no new ticket created:**
   ```bash
   GET http://localhost:5000/api/tickets
   ```
   - Ticket count should NOT increase

**Expected Result**: ✅ PASS
- Duplicate detected by EmailProcessingLog
- No new document created
- No new ticket created
- Email still marked as read

**If Failed**:
- Check EmailProcessingLog model
- Verify messageId is stored correctly
- Check database for duplicate prevention logic

---

### **TEST 5: Resolution Email Sending** ✓

**Objective**: Verify resolution emails sent via Gmail API

**Prerequisites**:
- TEST 3 passed
- Ticket exists from email
- User with Department Officer role

**Steps**:

1. **Log in as Department Officer:**
   - Role: Department Officer
   - Department: Safety (matches ticket)

2. **Navigate to ticket:**
   ```bash
   GET http://localhost:5000/api/tickets/{ticketId}
   ```

3. **Resolve ticket:**
   ```bash
   PATCH http://localhost:5000/api/tickets/{ticketId}/resolve
   Content-Type: application/json
   
   {
     "resolutionMessage": "Inspection completed successfully. All safety measures are in place and compliant with regulations. No further action required."
   }
   ```

4. **Check server logs:**

**Expected logs:**
```
[Gmail API] Resolution email sent | ticket=KMRL-2024-00001 | 
recipient=y***@example.com | messageId=18f5678abcd1234 | 
threadId=18f1234abcd5678 | at=2024-08-23T...
```

5. **Check ticket status:**
   ```bash
   GET http://localhost:5000/api/tickets/{ticketId}
   ```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "status": "Resolved",
    "resolutionMessage": "Inspection completed...",
    "resolutionEmailStatus": "sent",
    "resolutionEmailSentAt": "2024-08-23T...",
    ...
  }
}
```

6. **Verify original sender received email:**
   - Check inbox of email used in TEST 3
   - Should receive email from testhari2006@gmail.com

**Expected email:**
```
From: KMRL DocuSense <testhari2006@gmail.com>
To: your-email@example.com
Subject: Re: Test Safety Inspection Request

Dear Sir/Madam,

Your request has been reviewed by the KMRL Safety Department.

Resolution:
Inspection completed successfully. All safety measures are in place 
and compliant with regulations. No further action required.

Ticket ID: KMRL-2024-00001
Status: Resolved
Resolved by: Safety Department
Resolved on: 23 August 2024

Regards,
KMRL DocuSense
Kochi Metro Rail Limited
```

**Expected Result**: ✅ PASS
- Ticket status changed to "Resolved"
- Resolution email sent via Gmail API
- Original sender received email
- resolutionEmailStatus = "sent"

**If Failed**:
- Check Gmail API send permission granted
- Verify document has emailSender field
- Check ticket.documentId.source === 'email'
- See server error logs

---

### **TEST 6: Thread Preservation** ✓

**Objective**: Verify resolution emails appear in original thread

**Prerequisites**:
- TEST 5 passed
- Resolution email received

**Steps**:

1. **Open original sender's Gmail:**
   - Account used in TEST 3

2. **Find the email conversation:**
   - Search for subject: "Test Safety Inspection Request"

3. **Open the conversation:**

**Expected**:
- Conversation shows 2 messages:
  1. **Original message** (from you)
     - Subject: Test Safety Inspection Request
     - Has attachment: safety_inspection_report.pdf
  2. **Reply message** (from testhari2006@gmail.com)
     - Subject: Re: Test Safety Inspection Request
     - Contains resolution text

4. **Verify threading:**
   - Both messages appear in SAME conversation thread
   - Reply is indented under original
   - Gmail groups them together

**Expected Result**: ✅ PASS
- Resolution email appears as reply
- Same Gmail conversation thread
- Proper "Re:" subject prefix
- Threading headers preserved

**If Failed**:
- Check gmailService.js createEmailMessage() function
- Verify References and In-Reply-To headers
- Check threadId is passed correctly

---

## 📊 Test Results Summary

After completing all tests, fill in this summary:

| Test | Status | Notes |
|------|--------|-------|
| #1: OAuth Authentication | ⬜ PASS / ❌ FAIL | |
| #2: Server Startup | ⬜ PASS / ❌ FAIL | |
| #3: Incoming Email | ⬜ PASS / ❌ FAIL | |
| #4: Duplicate Prevention | ⬜ PASS / ❌ FAIL | |
| #5: Resolution Email | ⬜ PASS / ❌ FAIL | |
| #6: Thread Preservation | ⬜ PASS / ❌ FAIL | |

---

## 🔧 Common Test Issues

### **Issue: OAuth setup fails with "redirect_uri_mismatch"**

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Click your OAuth client
3. Add redirect URI: `http://localhost:5000/auth/google/callback`
4. Save and wait 5 minutes
5. Run setup script again

---

### **Issue: Server starts but shows "OAuth 2.0 configuration incomplete"**

**Solution**:
1. Run: `node scripts/validateGmailSetup.js`
2. Fix any missing environment variables
3. Ensure .env file is in correct location
4. Restart server

---

### **Issue: Emails not detected**

**Solution**:
1. Check `EMAIL_PROCESSING_ENABLED=true`
2. Verify email is unread in Gmail
3. Wait for poll cycle (default: 60 seconds)
4. Check server logs for errors
5. Verify Gmail API permissions granted

---

### **Issue: Resolution email not sent**

**Solution**:
1. Verify ticket.documentId.source === 'email'
2. Check document has emailSender field
3. Verify Gmail API send permission granted
4. Check server logs for error details
5. Retry email via API: `POST /api/tickets/{id}/resolution-email/retry`

---

### **Issue: Thread preservation not working**

**Solution**:
1. Check document has emailMetadata.threadId
2. Verify gmailService stores threadId correctly
3. Ensure createEmailMessage includes threading headers
4. Check Gmail conversation view (not inbox view)

---

## ✅ All Tests Passed?

If all tests pass:

1. **Document the results** in your testing log
2. **Mark migration as complete**
3. **Update README** with Gmail API setup instructions
4. **Train users** on new email workflow
5. **Monitor** logs for any issues in production

---

## 📚 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Testing Gmail API Apps](https://developers.google.com/gmail/api/guides/testing)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- Setup Guide: `docs/GMAIL_API_SETUP.md`

---

**Last Updated**: 2024-08-23  
**Version**: 1.0.0
