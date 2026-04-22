const express = require('express');
const {
  comparePrices,
  getPriceHistory,
  addPriceRecord
} = require('../controllers/pricing.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/compare', comparePrices);
router.get('/history/:productId', getPriceHistory);
router.post('/', addPriceRecord);

module.exports = router;
