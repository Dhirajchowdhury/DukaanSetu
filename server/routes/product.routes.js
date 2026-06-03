const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getStats,
  adjustStock,
  getTopProducts,
} = require('../controllers/product.controller');
const { protect } = require('../middleware/auth.middleware');
const { productValidation, validate } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getProducts)
  .post(logActivity('create', 'product', null, (req) => `Created product "${req.body.productName}"`), productValidation, validate, createProduct);

router.get('/stats', getStats);

router.get('/top/:userId', getTopProducts);

router.route('/:id')
  .get(getProduct)
  .put(logActivity('update', 'product', null, (req) => `Updated product ${req.params.id}`), updateProduct)
  .delete(logActivity('delete', 'product', null, (req) => `Deleted product ${req.params.id}`), deleteProduct);

router.patch('/:id/stock', logActivity('adjust_stock', 'product', null, (req) => `Adjusted stock for product ${req.params.id} by ${req.body.adjustment}`), adjustStock);

module.exports = router;
