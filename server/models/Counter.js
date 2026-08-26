// models/Counter.js — Atomic sequence counter for ticket ID generation
'use strict';

const mongoose = require('mongoose');

/**
 * A simple counter document keyed by a name (e.g., "ticket-2026").
 * Used with findOneAndUpdate + upsert to safely increment the sequence
 * even under concurrent request load.
 */
const counterSchema = new mongoose.Schema({
  // Unique key, e.g. "ticket-2026"
  _id: {
    type: String,
    required: true,
  },
  // Current sequence value
  seq: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Counter', counterSchema);
