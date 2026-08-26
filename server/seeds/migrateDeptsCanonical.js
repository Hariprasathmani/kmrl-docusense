'use strict';
/**
 * server/seeds/migrateDeptsCanonical.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE-TIME migration script — run manually ONCE against the live database to
 * normalise legacy department values.
 *
 * What it does:
 *  1. Admin users  → clear `department` (Admins don't need a scoped dept).
 *  2. Documents    → set `department = null` if value is 'General' or any
 *                    other non-canonical string (was used as AI fallback).
 *  3. Tickets      → set `department = 'IT'` if value is 'General' or any
 *                    other non-canonical string (Ticket enum requires a valid
 *                    canonical department).
 *  4. Prints a dry-run report first, then confirms before writing.
 *
 * Usage:
 *   node server/seeds/migrateDeptsCanonical.js [--dry-run]
 *
 *   --dry-run : Show what would change without writing anything.
 */

const mongoose = require('mongoose');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User     = require('../models/User');
const Document = require('../models/Document');
const Ticket   = require('../models/Ticket');

const CANONICAL_DEPTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];
const DRY_RUN = process.argv.includes('--dry-run');

// --- Connect -----------------------------------------------------------------

async function connect() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kmrl';
  await mongoose.connect(uri);
  console.log('\n[Migration] Connected to MongoDB: ' + uri);
}

// --- Step 1: Admin Users -----------------------------------------------------

async function migrateAdminUsers() {
  const adminUsers = await User.find({ role: 'Admin', department: { $ne: null } }).select('_id name email department');

  if (adminUsers.length === 0) {
    console.log('\n[Step 1] Admin users — No stale department values found. OK');
    return;
  }

  console.log('\n[Step 1] Admin users with non-null department (' + adminUsers.length + '):');
  for (const u of adminUsers) {
    console.log('  * ' + u.email + ' — department: \'' + u.department + '\' -> will be cleared');
  }

  if (!DRY_RUN) {
    const ids = adminUsers.map((u) => u._id);
    await User.updateMany({ _id: { $in: ids } }, { $unset: { department: '' } });
    console.log('  OK Cleared department on ' + adminUsers.length + ' Admin user(s).');
  } else {
    console.log('  [DRY-RUN] No changes written.');
  }
}

// --- Step 2: Audit Officer Users (manual review) -----------------------------

async function auditOfficerUsers() {
  const badUsers = await User.find({
    role: 'Department Officer',
    department: { $nin: [...CANONICAL_DEPTS, null, undefined] },
  }).select('_id name email department');

  if (badUsers.length === 0) {
    console.log('\n[Step 2] Department Officer users — all have canonical departments. OK');
    return;
  }

  console.log('\n[Step 2] Department Officers with NON-CANONICAL department (MANUAL REVIEW REQUIRED):');
  for (const u of badUsers) {
    console.log('  WARN ' + u.email + ' — department: \'' + u.department + '\'');
  }
  console.log('  -> These users need to be manually assigned a canonical department via the Users page.');
}

// --- Step 3: Documents -------------------------------------------------------

async function migrateDocuments() {
  const badDocs = await Document.find({
    department: { $nin: [...CANONICAL_DEPTS, null, undefined] },
  }).select('_id title department');

  if (badDocs.length === 0) {
    console.log('\n[Step 3] Documents — all have canonical departments. OK');
    return;
  }

  const valueCounts = {};
  for (const d of badDocs) {
    valueCounts[d.department] = (valueCounts[d.department] || 0) + 1;
  }
  console.log('\n[Step 3] Documents with non-canonical department (' + badDocs.length + ' total):');
  for (const [val, count] of Object.entries(valueCounts)) {
    console.log('  * \'' + val + '\' -> ' + count + ' document(s) — will be set to null');
  }

  if (!DRY_RUN) {
    const badIds = badDocs.map((d) => d._id);
    await Document.updateMany({ _id: { $in: badIds } }, { $set: { department: null } });
    console.log('  OK Set department = null on ' + badDocs.length + ' document(s).');
  } else {
    console.log('  [DRY-RUN] No changes written.');
  }
}

// --- Step 4: Tickets ---------------------------------------------------------

async function migrateTickets() {
  const badTickets = await Ticket.find({
    department: { $nin: CANONICAL_DEPTS },
  }).select('_id ticketId department');

  if (badTickets.length === 0) {
    console.log('\n[Step 4] Tickets — all have canonical departments. OK');
    return;
  }

  const valueCounts = {};
  for (const t of badTickets) {
    const key = t.department == null ? 'null/undefined' : t.department;
    valueCounts[key] = (valueCounts[key] || 0) + 1;
  }
  console.log('\n[Step 4] Tickets with non-canonical department (' + badTickets.length + ' total):');
  for (const [val, count] of Object.entries(valueCounts)) {
    console.log('  * \'' + val + '\' -> ' + count + ' ticket(s) — will be set to \'IT\'');
  }

  if (!DRY_RUN) {
    const badIds = badTickets.map((t) => t._id);
    await Ticket.updateMany({ _id: { $in: badIds } }, { $set: { department: 'IT' } });
    console.log('  OK Set department = \'IT\' on ' + badTickets.length + ' ticket(s).');
  } else {
    console.log('  [DRY-RUN] No changes written.');
  }
}

// --- Main --------------------------------------------------------------------

async function main() {
  console.log('=======================================================');
  console.log('  KMRL DocuSense -- Department Name Migration Script');
  console.log('  Mode: ' + (DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE (will write to DB)'));
  console.log('  Canonical departments: ' + CANONICAL_DEPTS.join(', '));
  console.log('=======================================================');

  await connect();

  await migrateAdminUsers();
  await auditOfficerUsers();
  await migrateDocuments();
  await migrateTickets();

  console.log('\n=======================================================');
  console.log(DRY_RUN ? '  DRY-RUN complete -- re-run without --dry-run to apply.' : '  Migration complete OK');
  console.log('=======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
