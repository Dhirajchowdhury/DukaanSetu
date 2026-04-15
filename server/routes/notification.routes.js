const express = require('express');
const { getNotifications } = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);

module.exports = router;
