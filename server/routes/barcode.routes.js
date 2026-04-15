const express = require('express');
const { lookupProduct, recordScan } = require('../controllers/barcode.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/lookup', lookupProduct);
router.post('/scan', recordScan);

module.exports = router;
