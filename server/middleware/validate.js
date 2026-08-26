// middleware/validate.js — express-validator result handler
'use strict';

const { validationResult } = require('express-validator');

/**
 * Runs after express-validator chains.
 * Returns 422 with error details if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation error',
      errors: errors.array(),
    });
  }
  next();
};

module.exports = validate;
