const { body, validationResult } = require('express-validator');

// Validation middleware untuk update status
exports.validateStatusUpdate = [
  body('status')
    .notEmpty()
    .withMessage('Status wajib diisi')
    .isIn(['Menunggu', 'Bisa dilanjutkan', 'Ditutup'])
    .withMessage('Status harus salah satu dari: Menunggu, Bisa dilanjutkan, Ditutup'),

  // Middleware untuk handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validasi gagal',
        errors: errors.array()
      });
    }
    next();
  }
];
