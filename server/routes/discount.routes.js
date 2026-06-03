const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activityLogger');
const {
  getDiscountRules, createDiscountRule, updateDiscountRule, deleteDiscountRule, applyDiscount,
} = require('../controllers/discount.controller');

const router = express.Router();
router.use(protect);

router.get('/', getDiscountRules);
router.post('/', logActivity('create', 'discount_rule', null, () => 'Discount rule created'), createDiscountRule);
router.put('/:id', logActivity('update', 'discount_rule', null, () => 'Discount rule updated'), updateDiscountRule);
router.delete('/:id', logActivity('delete', 'discount_rule', null, () => 'Discount rule deleted'), deleteDiscountRule);
router.post('/:orderId/apply', applyDiscount);

module.exports = router;
