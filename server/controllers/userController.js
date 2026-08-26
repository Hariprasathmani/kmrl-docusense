// controllers/userController.js — User Management (Admin only)
'use strict';

const bcrypt   = require('bcryptjs');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User     = require('../models/User');

// ─── Constants ───────────────────────────────────────────────────────────────
const VALID_ROLES  = ['Admin', 'Department Officer'];
const VALID_DEPTS  = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];
const FIXED_ADMIN_EMAIL = 'hariprasathmani102@gmail.com';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/officers/:department
// Returns active Department Officers for a specific department.
// Used by the Admin assignment dropdown — returns only the fields needed.
// ─────────────────────────────────────────────────────────────────────────────
exports.getOfficersByDepartment = async (req, res, next) => {
  try {
    const { department } = req.params;

    if (!VALID_DEPTS.includes(department))
      return res.status(400).json({
        success: false,
        message: `Invalid department. Must be one of: ${VALID_DEPTS.join(', ')}.`,
      });

    const officers = await User.find({
      role:       'Department Officer',
      department,
      status:     'Active',
    })
      .select('_id name email department status')
      .sort({ name: 1 });

    return res.status(200).json({ success: true, data: officers });
  } catch (err) { next(err); }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const safeId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Return true if this user is the immutable system Admin */
const isFixedAdmin = (user) =>
  user?.email?.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users  — list all users (Admin only)
// Supports: ?search=  ?department=  ?status=  ?page=  ?limit=
// ─────────────────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const {
      page       = 1,
      limit      = 50,
      search     = '',
      department = '',
      status     = '',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) query.department = department;
    if (status)     query.status     = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getUser = async (req, res, next) => {
  try {
    if (!safeId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const user = await User.findById(req.params.id).select('-password');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    return res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users  — create Department Officer (Admin only)
// Role is always forced to 'Department Officer' — Admins cannot be created here.
// ─────────────────────────────────────────────────────────────────────────────
exports.createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ success: false, message: 'Validation error', errors: errors.array() });

    const { name, email, password, department, status = 'Active' } = req.body;

    // Prevent creating another Admin — always force Department Officer
    const role = 'Department Officer';

    // Block reserving the fixed Admin email
    if (email?.toLowerCase() === FIXED_ADMIN_EMAIL.toLowerCase())
      return res.status(403).json({ success: false, message: 'This email is reserved for the system administrator.' });

    // Duplicate email check
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    // Validate department
    if (!department || !VALID_DEPTS.includes(department))
      return res.status(400).json({ success: false, message: `Invalid department. Must be one of: ${VALID_DEPTS.join(', ')}.` });

    // Validate status
    if (!['Active', 'Inactive'].includes(status))
      return res.status(400).json({ success: false, message: 'Status must be Active or Inactive.' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      department,
      status,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        _id:        user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        department: user.department,
        status:     user.status,
        createdAt:  user.createdAt,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id  — update user (Admin only)
// Allowed fields: name, email, department, status
// Role field is ignored (cannot be changed via this endpoint)
// Fixed Admin is immutable.
// ─────────────────────────────────────────────────────────────────────────────
exports.updateUser = async (req, res, next) => {
  try {
    if (!safeId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    // Block all edits to fixed Admin
    if (isFixedAdmin(user))
      return res.status(403).json({ success: false, message: 'The fixed system administrator account cannot be modified.' });

    const { name, email, department, status } = req.body;

    // Apply allowed field changes
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
      user.name = trimmed;
    }

    if (email !== undefined) {
      const normalised = String(email).toLowerCase().trim();
      // Cannot take fixed Admin's email
      if (normalised === FIXED_ADMIN_EMAIL.toLowerCase())
        return res.status(403).json({ success: false, message: 'This email is reserved.' });
      // Duplicate check (exclude self)
      const existing = await User.findOne({ email: normalised });
      if (existing && existing._id.toString() !== user._id.toString())
        return res.status(409).json({ success: false, message: 'Email is already in use by another account.' });
      user.email = normalised;
    }

    if (department !== undefined) {
      if (!VALID_DEPTS.includes(department))
        return res.status(400).json({ success: false, message: `Invalid department.` });
      user.department = department;
    }

    if (status !== undefined) {
      if (!['Active', 'Inactive'].includes(status))
        return res.status(400).json({ success: false, message: 'Status must be Active or Inactive.' });
      user.status = status;
    }

    // Role is intentionally NOT settable here.
    // Department Officers remain Department Officers.

    await user.save();

    const updated = user.toObject();
    delete updated.password;

    return res.status(200).json({ success: true, message: 'User updated.', data: updated });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/toggle-status  — activate or deactivate (Admin only)
// Fixed Admin can never be deactivated.
// ─────────────────────────────────────────────────────────────────────────────
exports.toggleStatus = async (req, res, next) => {
  try {
    if (!safeId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    if (isFixedAdmin(user))
      return res.status(403).json({ success: false, message: 'The fixed system administrator account cannot be deactivated.' });

    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status))
      return res.status(400).json({ success: false, message: 'Status must be Active or Inactive.' });

    user.status = status;
    await user.save();

    const updated = user.toObject();
    delete updated.password;

    return res.status(200).json({
      success: true,
      message: `User ${status === 'Active' ? 'activated' : 'deactivated'} successfully.`,
      data: updated,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/reset-password  — reset password (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    if (!safeId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/:id  — soft delete via status=Inactive (Admin only)
// Fixed Admin can never be deleted.
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    if (!safeId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    // Never delete the fixed Admin
    if (isFixedAdmin(user))
      return res.status(403).json({
        success: false,
        message: 'The fixed system administrator account cannot be deleted.',
      });

    // Soft delete — set status to Inactive to preserve document/ticket references
    user.status = 'Inactive';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully. Their documents and tickets are preserved.',
    });
  } catch (err) { next(err); }
};
