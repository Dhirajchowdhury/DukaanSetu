const express = require('express');
const { getActivityLogs } = require('../controllers/activity.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getActivityLogs);

module.exports = router;
