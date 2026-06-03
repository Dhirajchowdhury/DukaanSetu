const express = require('express');
const { getSalesReports } = require('../controllers/salesReports.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getSalesReports);

module.exports = router;
