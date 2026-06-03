const express = require('express');
const {
  getAnalytics,
  getTurnover,
  getProfitLoss,
  getRestockSuggestions,
  getRetention,
  getProducerInsights,
} = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getAnalytics);
router.get('/turnover', getTurnover);
router.get('/profit-loss', getProfitLoss);
router.get('/restock-suggestions', getRestockSuggestions);
router.get('/retention', getRetention);
router.get('/producer-insights', getProducerInsights);

module.exports = router;
