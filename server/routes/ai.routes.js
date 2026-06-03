const express = require('express');
const {
  demandForecast,
  deepDemandForecast,
  bundleSuggestions,
  festivalSuggestions,
  wasteReduction,
  supplierRecommendation,
  chat,
  personalizedOffers,
} = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/demand-forecast', demandForecast);
router.get('/demand-forecast/deep', deepDemandForecast);
router.get('/bundle-suggestions', bundleSuggestions);
router.get('/festival-suggestions', festivalSuggestions);
router.get('/waste-reduction', wasteReduction);
router.get('/supplier-recommendation', supplierRecommendation);
router.post('/chat', chat);
router.get('/personalized-offers/:buyerId', personalizedOffers);

module.exports = router;
