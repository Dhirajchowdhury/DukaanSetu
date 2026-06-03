const express = require('express');
const { getRatings, createRating } = require('../controllers/supplierRating.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/:supplierId/ratings', getRatings);
router.post('/:supplierId/rate', createRating);

module.exports = router;
