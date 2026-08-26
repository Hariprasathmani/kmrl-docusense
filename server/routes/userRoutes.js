// routes/userRoutes.js — User management endpoints (Admin only)
'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All user routes require authentication + Admin role
router.use(protect);

// ─── GET /api/users/officers/:department
// Active Department Officers for one department — used by assignment dropdown.
router.get('/officers/:department', authorize('Admin'), userController.getOfficersByDepartment);

// ─── GET /api/users — list users with pagination/search (Admin only)
router.get('/', authorize('Admin'), userController.getUsers);

// ─── GET /api/users/:id — get single user (Admin only)
router.get('/:id', authorize('Admin'), userController.getUser);

// ─── POST /api/users — create Department Officer (Admin only)
// Role is always forced to 'Department Officer' in the controller.
router.post(
  '/',
  authorize('Admin'),
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .escape(),
    body('email')
      .trim()
      .isEmail().withMessage('A valid email address is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('department')
      .trim()
      .notEmpty().withMessage('Department is required')
      .isIn(['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'])
      .withMessage('Invalid department'),
    body('status')
      .optional()
      .isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
  ],
  userController.createUser
);

// ─── PATCH /api/users/:id — update user profile/dept/status (Admin only)
router.patch('/:id', authorize('Admin'), userController.updateUser);

// ─── PATCH /api/users/:id/toggle-status — activate or deactivate (Admin only)
router.patch('/:id/toggle-status', authorize('Admin'), userController.toggleStatus);

// ─── PATCH /api/users/:id/reset-password — reset password (Admin only)
router.patch('/:id/reset-password', authorize('Admin'), userController.resetPassword);

// ─── DELETE /api/users/:id — soft-delete user (Admin only)
router.delete('/:id', authorize('Admin'), userController.deleteUser);

module.exports = router;
