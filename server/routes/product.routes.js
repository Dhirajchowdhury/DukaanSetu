const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getStats,
} = require('../controllers/product.controller');
const { protect } = require('../middleware/auth.middleware');
const { productValidation, validate } = require('../middleware/validation.middleware');

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
  .get(getProducts)
  .post(productValidation, validate, createProduct);

router.get('/stats', getStats);

router.route('/:id')
  .get(getProduct)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
