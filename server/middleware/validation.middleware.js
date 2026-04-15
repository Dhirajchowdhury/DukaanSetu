const { body, validationResult } = require('express-validator');

/**
 * Validation rules for user signup
 */
const signupValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('shopName').trim().notEmpty().withMessage('Shop name is required'),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
];

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Validation rules for product creation
 */
const productValidation = [
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('categoryId').isMongoId().withMessage('Valid category ID is required'),
  body('quantity').isNumeric().withMessage('Quantity must be a number'),
];

/**
 * Validation rules for category creation
 */
const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
];

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = {
  signupValidation,
  loginValidation,
  productValidation,
  categoryValidation,
  validate,
};
