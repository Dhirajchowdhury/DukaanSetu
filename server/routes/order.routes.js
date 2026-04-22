const express = require('express');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  repeatOrder
} = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrder)
  .delete(deleteOrder);

router.put('/:id/status', updateOrderStatus);
router.post('/:id/repeat', repeatOrder);

module.exports = router;
