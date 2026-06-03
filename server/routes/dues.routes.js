const express = require('express');
const { getPendingDues, sendDueReminder, sendBuyerNudge } = require('../controllers/dues.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getPendingDues);
router.post('/:orderId/remind', sendDueReminder);
router.post('/send-reminder', sendBuyerNudge);

module.exports = router;
