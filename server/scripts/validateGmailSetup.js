/**
 * KMRL DocuSense - Gmail API Setup Validation
 * 
 * This script validates that Gmail API OAuth 2.0 is configured correctly
 * WITHOUT attempting to connect to Gmail (so it can run before credentials are set).
 * 
 * Usage:
 *   node scripts/validateGmailSetup.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  KMRL DOCUSENSE - GMAIL API SETUP VALIDATION');
console.log('═══════════════════════════════════════════════════════');
console.log('');

let errors = 0;
let warnings = 0;

function error(msg) {
  console.error('❌', msg);
  errors++;
}

function warning(msg) {
  console.warn('⚠️ ', msg);
  warnings++;
}

function success(msg) {
  console.log('✅', msg);
}

function info(msg) {
  console.log('ℹ️ ', msg);
}

// ═══════════════════════════════════════════════════════════════
// 1. CHECK ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════

console.log('1. ENVIRONMENT VARIABLES');
console.log('───────────────────────────────────────────────────────');

const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'GOOGLE_REFRESH_TOKEN',
  'GMAIL_USER_EMAIL',
];

const optionalVars = [
  'EMAIL_PROCESSING_ENABLED',
  'GMAIL_POLL_INTERVAL_MS',
  'EMAIL_RETRY_INTERVAL_MS',
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    error(`${varName} is missing or empty`);
  } else {
    success(`${varName} is set`);
  }
});

optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    info(`${varName} not set (optional)`);
  } else {
    success(`${varName} is set: ${value}`);
  }
});

console.log('');

// ═══════════════════════════════════════════════════════════════
// 2. VALIDATE ENVIRONMENT VARIABLE FORMAT
// ═══════════════════════════════════════════════════════════════

console.log('2. ENVIRONMENT VARIABLE FORMAT');
console.log('───────────────────────────────────────────────────────');

// Check CLIENT_ID format
if (process.env.GOOGLE_CLIENT_ID) {
  if (process.env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
    success('GOOGLE_CLIENT_ID format looks correct');
  } else {
    warning('GOOGLE_CLIENT_ID format may be incorrect (should end with .apps.googleusercontent.com)');
  }
}

// Check CLIENT_SECRET format
if (process.env.GOOGLE_CLIENT_SECRET) {
  if (process.env.GOOGLE_CLIENT_SECRET.startsWith('GOCSPX-')) {
    success('GOOGLE_CLIENT_SECRET format looks correct');
  } else {
    warning('GOOGLE_CLIENT_SECRET format may be incorrect (usually starts with GOCSPX-)');
  }
}

// Check REDIRECT_URI
if (process.env.GOOGLE_REDIRECT_URI) {
  const uri = process.env.GOOGLE_REDIRECT_URI;
  if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
    success('GOOGLE_REDIRECT_URI is set for local development');
  } else if (uri.startsWith('https://')) {
    success('GOOGLE_REDIRECT_URI is set for production');
  } else if (uri.startsWith('http://') && !uri.includes('localhost')) {
    warning('GOOGLE_REDIRECT_URI uses HTTP (should use HTTPS in production)');
  } else {
    error('GOOGLE_REDIRECT_URI format is invalid');
  }
}

// Check REFRESH_TOKEN
if (process.env.GOOGLE_REFRESH_TOKEN) {
  if (process.env.GOOGLE_REFRESH_TOKEN.startsWith('1//')) {
    success('GOOGLE_REFRESH_TOKEN format looks correct');
  } else {
    warning('GOOGLE_REFRESH_TOKEN format may be incorrect (usually starts with 1//)');
  }
}

// Check EMAIL format
if (process.env.GMAIL_USER_EMAIL) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(process.env.GMAIL_USER_EMAIL)) {
    success('GMAIL_USER_EMAIL format is valid');
  } else {
    error('GMAIL_USER_EMAIL format is invalid');
  }
}

console.log('');

// ═══════════════════════════════════════════════════════════════
// 3. CHECK FILE STRUCTURE
// ═══════════════════════════════════════════════════════════════

console.log('3. FILE STRUCTURE');
console.log('───────────────────────────────────────────────────────');

const requiredFiles = [
  { path: 'services/gmailService.js', description: 'Gmail API service' },
  { path: 'scripts/setupGmailOAuth.js', description: 'OAuth setup utility' },
  { path: 'docs/GMAIL_API_SETUP.md', description: 'Setup documentation' },
];

requiredFiles.forEach(({ path: filePath, description }) => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    success(`${description} exists: ${filePath}`);
  } else {
    error(`${description} missing: ${filePath}`);
  }
});

console.log('');

// ═══════════════════════════════════════════════════════════════
// 4. CHECK PACKAGE DEPENDENCIES
// ═══════════════════════════════════════════════════════════════

console.log('4. PACKAGE DEPENDENCIES');
console.log('───────────────────────────────────────────────────────');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredPackages = [
    'googleapis',
    'mailparser',
    'open',
  ];
  
  requiredPackages.forEach(pkg => {
    if (deps[pkg]) {
      success(`${pkg} installed: ${deps[pkg]}`);
    } else {
      error(`${pkg} not installed`);
    }
  });
} else {
  error('package.json not found');
}

console.log('');

// ═══════════════════════════════════════════════════════════════
// 5. CHECK OLD IMAP/SMTP REFERENCES
// ═══════════════════════════════════════════════════════════════

console.log('5. OLD IMAP/SMTP REFERENCES');
console.log('───────────────────────────────────────────────────────');

// Check index.js
const indexPath = path.join(__dirname, '..', 'index.js');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  if (indexContent.includes('startGmailService')) {
    success('index.js uses startGmailService (Gmail API)');
  } else if (indexContent.includes('startEmailService')) {
    error('index.js still uses startEmailService (old IMAP)');
  } else {
    warning('index.js does not start any email service');
  }
  
  if (indexContent.includes('gmailService')) {
    success('index.js imports from gmailService');
  } else if (indexContent.includes('emailService') && !indexContent.includes('gmailService')) {
    error('index.js still imports from emailService (old IMAP)');
  }
} else {
  error('index.js not found');
}

// Check ticketController.js
const ticketControllerPath = path.join(__dirname, '..', 'controllers', 'ticketController.js');
if (fs.existsSync(ticketControllerPath)) {
  const ticketContent = fs.readFileSync(ticketControllerPath, 'utf8');
  
  if (ticketContent.includes("require('../services/gmailService')")) {
    success('ticketController.js imports from gmailService');
  } else if (ticketContent.includes("require('../services/emailService')")) {
    error('ticketController.js still imports from emailService (old IMAP)');
  }
} else {
  error('ticketController.js not found');
}

console.log('');

// ═══════════════════════════════════════════════════════════════
// 6. CHECK .gitignore
// ═══════════════════════════════════════════════════════════════

console.log('6. SECURITY - .gitignore');
console.log('───────────────────────────────────────────────────────');

const gitignorePath = path.join(__dirname, '..', '..', '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  
  const requiredEntries = ['.env', 'credentials.json', 'token.json'];
  const missingEntries = [];
  
  requiredEntries.forEach(entry => {
    if (gitignoreContent.includes(entry)) {
      success(`.gitignore includes ${entry}`);
    } else {
      missingEntries.push(entry);
    }
  });
  
  if (missingEntries.length > 0) {
    warning(`.gitignore missing: ${missingEntries.join(', ')} (credentials may be committed!)`);
  }
} else {
  warning('.gitignore not found');
}

console.log('');

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════');
console.log('  VALIDATION SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log('');

if (errors === 0 && warnings === 0) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('');
  console.log('Your Gmail API setup looks correct.');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Ensure you have completed Google Cloud setup (see docs/GMAIL_API_SETUP.md)');
  console.log('  2. Run: node scripts/setupGmailOAuth.js (if not done already)');
  console.log('  3. Start server: npm start');
  console.log('  4. Send a test email to verify');
  console.log('');
  process.exit(0);
} else {
  console.log(`❌ Found ${errors} error(s) and ${warnings} warning(s)`);
  console.log('');
  
  if (errors > 0) {
    console.log('Please fix the errors above before proceeding.');
    console.log('');
    console.log('Common fixes:');
    console.log('  • Missing environment variables: Run node scripts/setupGmailOAuth.js');
    console.log('  • Missing files: Check that all files were created correctly');
    console.log('  • Old IMAP references: Update imports in index.js and ticketController.js');
    console.log('');
  }
  
  if (warnings > 0) {
    console.log('Warnings should be addressed but won\'t prevent the system from working.');
  }
  
  console.log('For detailed setup instructions, see: docs/GMAIL_API_SETUP.md');
  console.log('');
  process.exit(1);
}
