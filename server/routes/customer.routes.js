const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activityLogger');
const {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  getCustomerOrders, getLoyaltyTransactions, awardLoyaltyPoints, redeemLoyaltyPoints,
} = require('../controllers/customer.controller');

const router = express.Router();
router.use(protect);

router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', logActivity('create', 'customer', null, (req) => `Customer ${req.body.name} created`), createCustomer);
router.put('/:id', logActivity('update', 'customer', null, (req) => `Customer updated`), updateCustomer);
router.delete('/:id', logActivity('delete', 'customer', null, (req) => `Customer deleted`), deleteCustomer);
router.get('/:id/orders', getCustomerOrders);
router.get('/:customerId/loyalty', getLoyaltyTransactions);
router.post('/:customerId/loyalty/award', awardLoyaltyPoints);
router.post('/:customerId/loyalty/redeem', redeemLoyaltyPoints);

module.exports = router;
