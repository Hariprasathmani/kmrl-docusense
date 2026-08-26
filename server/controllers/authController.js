// controllers/authController.js — KMRL DocuSense Authentication
'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// ─── Helper ──────────────────────────────────────────────────
/**
 * Signs a JWT containing the user's id, role, and email.
 * Expiry is read from JWT_EXPIRES_IN env (default 7d).
 */
const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, email: user.email, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
/**
 * Register Flow:
 *  1. Check if email already exists
 *  2. Hash the plain-text password with bcrypt
 *  3. Persist the new user document
 *  4. Return 201 with success message (no token on register)
 */
exports.register = async (req, res) => {
  let { name, email, password, role, department } = req.body;

  // Reserved admin email check
  if (email.toLowerCase() === 'hariprasathmani102@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'This email is reserved for the system administrator.',
    });
  }

  // Enforce role boundaries — only 'Admin' is reserved and cannot be self-assigned
  if (role === 'Admin') {
    role = 'Department Officer'; // Silently downgrade Admin attempts to Department Officer
  }

  // 1 — Duplicate email check
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
    });
  }

  // 2 — Hash password (salt rounds = 12)
  const hashedPassword = await bcrypt.hash(password, 12);

  // 3 — Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role:       role       || 'Department Officer',
    department: department || undefined,
  });

  // 4 — Respond (never return the password)
  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: {
      id:         user._id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      department: user.department,
      createdAt:  user.createdAt,
    },
  });
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
/**
 * Login Flow:
 *  1. Find user by email (explicitly select password field)
 *  2. Compare submitted password against bcrypt hash
 *  3. Sign and return a JWT
 *  4. Return token + sanitised user data
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // 1 — Look up user; password is excluded by default so use .select()
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // 2 — Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // 3 — Issue JWT
  const token = signToken(user);

  // 4 — Respond
  res.status(200).json({
    success: true,
    message: 'Login successful.',
    token,
    data: {
      id:         user._id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      department: user.department,
    },
  });
};
