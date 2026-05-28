const { body, validationResult } = require('express-validator');

/**
 * Validation rules for user signup
 */
const signupValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('shopName').custom((value, { req }) => {
    const shop = req.body.shopName ?? req.body.shop_name;
    if (!shop || !shop.trim()) {
      throw new Error('Shop name is required');
    }
    return true;
  }),
  body('phoneNumber').custom((value, { req }) => {
    const phone = req.body.phoneNumber ?? req.body.phone_number;
    if (!phone || !phone.trim()) {
      throw new Error('Phone number is required');
    }
    return true;
  }),
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
  body('categoryId').isUUID().withMessage('Valid category ID (UUID) is required'),
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
