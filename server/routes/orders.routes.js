const express = require('express');
const { createOrder, createOrderBulk, getBuyingOrders, getSellingOrders, getOrders, updateOrderStatus, editOrderItems, creditCheckout, downloadReceipt, checkFraudEndpoint } = require('../controllers/orders.controller');
const { protect } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();
router.use(protect);

router.post('/', logActivity('create', 'order', null, (req, body) => `Order placed for ₹${body.order?.total_price || 0}`), createOrder);
router.post('/bulk', logActivity('create', 'order_bulk', null, (req, body) => `Bulk order placed for ₹${body.order?.total_price || 0}`), createOrderBulk);
router.get('/buying', getBuyingOrders);
router.get('/selling', getSellingOrders);
router.get('/', getOrders);
router.put('/:id', logActivity('update', 'order', null, (req) => `Order status updated to ${req.body.status}`), updateOrderStatus);
router.put('/:id/items', logActivity('update', 'order_items', null, () => 'Order items edited'), editOrderItems);
router.post('/:id/credit', creditCheckout);
router.get('/:id/receipt', downloadReceipt);
router.get('/:id/fraud-check', checkFraudEndpoint);

module.exports = router;
