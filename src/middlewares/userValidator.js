const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Middleware untuk menangani hasil validasi
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Validasi userId di params
const validateUserId = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid user ID format');
      }
      return true;
    }),
  handleValidationErrors
];

// Validasi competency data
const validateCompetency = [
  body('competencyId')
    .notEmpty()
    .withMessage('Competency ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid competency ID format');
      }
      return true;
    }),
  handleValidationErrors
];

// Validasi array of competencies
const validateCompetencies = [
  body('competencies')
    .isArray()
    .withMessage('Competencies must be an array')
    .custom((competencies) => {
      if (competencies.length > 20) {
        throw new Error('Maximum 20 competencies allowed');
      }
      for (const compId of competencies) {
        if (!mongoose.Types.ObjectId.isValid(compId)) {
          throw new Error(`Invalid competency ID format: ${compId}`);
        }
      }
      return true;
    }),
  handleValidationErrors
];

// Validasi competency index
const validateCompetencyIndex = [
  param('index')
    .notEmpty()
    .withMessage('Index is required')
    .isInt({ min: 0 })
    .withMessage('Index must be a non-negative integer'),
  handleValidationErrors
];

// Validasi search query
const validateCompetencySearch = [
  query('competencyId')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid competency ID format');
      }
      return true;
    }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  handleValidationErrors
];

module.exports = {
  validateUserId,
  validateCompetency,
  validateCompetencies,
  validateCompetencyIndex,
  validateCompetencySearch
};
