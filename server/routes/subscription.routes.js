const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activityLogger');
const {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  getDeliverySchedule, markDelivery, generateDeliverySchedule,
} = require('../controllers/subscription.controller');

const router = express.Router();
router.use(protect);

router.get('/', getSubscriptions);
router.post('/', logActivity('create', 'subscription', null, () => 'Subscription created'), createSubscription);
router.put('/:id', logActivity('update', 'subscription', null, () => 'Subscription updated'), updateSubscription);
router.delete('/:id', logActivity('delete', 'subscription', null, () => 'Subscription deleted'), deleteSubscription);
router.get('/deliveries', getDeliverySchedule);
router.post('/:id/generate-deliveries', generateDeliverySchedule);
router.put('/deliveries/:id', markDelivery);

module.exports = router;
