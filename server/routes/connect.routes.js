const express = require('express');
const {
  getWholesalerProducts,
  getMyListings,
  createListing,
  updateListing,
  deleteListing,
} = require('../controllers/connect.controller');
const { protect } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

const router = express.Router();
router.use(protect);

const listingValidation = [
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('pricePerUnit').isFloat({ gt: 0 }).withMessage('Price must be > 0'),
  body('moq').optional().isInt({ min: 1 }).withMessage('MOQ must be >= 1'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
};

// Browse marketplace
router.get('/', getWholesalerProducts);

// My listings (wholesaler/producer)
router.get('/my-listings', getMyListings);
router.post('/my-listings', listingValidation, validate, createListing);
router.put('/my-listings/:id', updateListing);
router.delete('/my-listings/:id', deleteListing);

module.exports = router;
