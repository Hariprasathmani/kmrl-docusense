// config/setupAdmin.js — Ensure one system administrator exists
'use strict';

const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ADMIN_EMAIL = 'hariprasathmani102@gmail.com';
const ADMIN_NAME = 'Hari Prasath';
const DEFAULT_PASS = 'Kmrl@123';

/**
 * Ensures the system administrator exists and is correctly configured.
 * On every start:
 *  - If the admin doesn't exist, creates them.
 *  - If they exist but the stored hash no longer matches DEFAULT_PASS,
 *    the hash is regenerated so the default credentials always work.
 *  - Role, status, and name are enforced.
 *  - Department is intentionally NOT set — Admins have full cross-department
 *    access via role-based access control and do not need a scoped department.
 */
async function ensureSystemAdmin() {
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

    if (existing) {
      let changed = false;
      if (existing.role !== 'Admin') {
        existing.role = 'Admin';
        changed = true;
      }
      // Clear any stale non-canonical department value that may have been set
      // by an older version of this script (e.g. 'Administration').
      if (existing.department != null) {
        existing.department = undefined;
        changed = true;
      }
      if (existing.status !== 'Active') {
        existing.status = 'Active';
        changed = true;
      }
      if (existing.name !== ADMIN_NAME) {
        existing.name = ADMIN_NAME;
        changed = true;
      }

      // ── Password sync: if the stored hash no longer matches DEFAULT_PASS, reset it ──
      const passwordMatches = await bcrypt.compare(DEFAULT_PASS, existing.password || '');
      if (!passwordMatches) {
        existing.password = await bcrypt.hash(DEFAULT_PASS, 12);
        changed = true;
        console.log('[Admin Setup] Password hash out of sync — reset to default.');
      }

      if (changed) {
        await existing.save();
        console.log(`[Admin Setup] Admin account ${ADMIN_EMAIL} updated and verified.`);
      } else {
        console.log(`[Admin Setup] System Administrator ${ADMIN_EMAIL} verified — no changes needed.`);
      }
    } else {
      // Create new Admin
      const hashedPassword = await bcrypt.hash(DEFAULT_PASS, 12);
      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'Admin',
        // No department — Admin role grants full cross-department access via RBAC.
        status: 'Active',
      });
      console.log(`[Admin Setup] Created new System Administrator: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error('[Admin Setup] Failed to setup system administrator:', error);
  }
}

module.exports = ensureSystemAdmin;
