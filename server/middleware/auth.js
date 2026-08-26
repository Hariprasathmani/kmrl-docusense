// middleware/auth.js — JWT authentication + inactive-user guard
'use strict';

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protects routes by verifying the JWT Bearer token.
 * Also performs a DB lookup to ensure the account is still Active.
 * Attaches the full decoded payload to req.user.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorised — no token' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorised — invalid token' });
  }

  // DB lookup — verify account still exists and is Active
  try {
    const user = await User.findById(decoded.id).select('_id role email department status');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorised — account not found' });
    }
    if (user.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is inactive. Please contact your administrator.' });
    }
    req.user = {
      id:         user._id.toString(),
      role:       user.role,
      email:      user.email,
      department: user.department,
      status:     user.status,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based access control guard.
 * @param  {...string} roles  Allowed roles (e.g. 'Admin', 'Department Officer')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden — insufficient permissions' });
  }
  next();
};

module.exports = { protect, authorize };
