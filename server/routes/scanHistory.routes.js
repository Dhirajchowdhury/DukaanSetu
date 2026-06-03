const express = require('express');
const { getScanHistory } = require('../controllers/scanHistory.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getScanHistory);

module.exports = router;
