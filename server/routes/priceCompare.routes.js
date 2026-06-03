const express = require('express');
const { priceCompare } = require('../controllers/priceCompare.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', priceCompare);

module.exports = router;
