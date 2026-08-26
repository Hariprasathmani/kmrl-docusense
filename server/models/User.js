// models/User.js — KMRL DocuSense User schema
'use strict';

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,          // never returned in query results by default
    },

    // ── Access control ────────────────────────────────────────
    role: {
      type: String,
      enum: {
        values: ['Admin', 'Department Officer'],
        message: 'Role must be Admin or Department Officer',
      },
      default: 'Department Officer',
    },

    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive'],
        message: 'Status must be Active or Inactive',
      },
      default: 'Active',
    },

    // ── Organisation ─────────────────────────────────────────
    department: {
      type: String,
      trim: true,
      enum: {
        values: ['Finance', 'HR', 'Safety', 'Legal', 'Operations', 'IT'],
        message: 'Invalid department',
      },
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
