const express = require('express');
const { createOrder, getOrders, updateOrderStatus } = require('../controllers/orders.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.post('/',     createOrder);
router.get('/',      getOrders);
router.put('/:id',   updateOrderStatus);

module.exports = router;
