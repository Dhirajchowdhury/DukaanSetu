const express = require('express');
const { getProductRanking } = require('../controllers/productRanking.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getProductRanking);

module.exports = router;
