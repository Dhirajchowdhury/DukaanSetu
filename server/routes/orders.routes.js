const express = require('express');
const { createOrder, getBuyingOrders, getSellingOrders, getOrders, updateOrderStatus } = require('../controllers/orders.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.post('/', createOrder);
router.get('/buying', getBuyingOrders);
router.get('/selling', getSellingOrders);
router.get('/', getOrders);
router.put('/:id', updateOrderStatus);

module.exports = router;
