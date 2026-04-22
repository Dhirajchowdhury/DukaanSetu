const Order = require('../models/Order');

// @desc    Get all orders for a user
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('supplierId', 'name contact')
      .populate('products.productId', 'productName brand imageUrl')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('supplierId', 'name contact')
      .populate('products.productId', 'productName brand imageUrl');
      
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Ensure user owns order or is admin
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to access this order' });
    }
    
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    // Calculate total amount if not provided
    let { supplierId, products, totalAmount, notes } = req.body;
    
    if (!totalAmount) {
      totalAmount = products.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }

    const order = await Order.create({
      userId: req.user.id,
      supplierId,
      products,
      totalAmount,
      notes
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Accepted', 'Ready', 'Delivered', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only allow cancellation if pending
    if (status === 'Cancelled' && order.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an order that is already processed' });
    }

    order.status = status;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (cancel) order
// @route   DELETE /api/orders/:id
// @access  Private
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Can only delete pending orders' });
    }

    await order.deleteOne();
    
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Repeat past order
// @route   POST /api/orders/:id/repeat
// @access  Private
exports.repeatOrder = async (req, res, next) => {
  try {
    const oldOrder = await Order.findById(req.params.id);
    
    if (!oldOrder) {
      return res.status(404).json({ success: false, message: 'Original order not found' });
    }
    
    const newOrder = await Order.create({
      userId: req.user.id,
      supplierId: oldOrder.supplierId,
      products: oldOrder.products,
      totalAmount: oldOrder.totalAmount,
      notes: `Repeat of order ${oldOrder._id}`,
      status: 'Pending'
    });
    
    res.status(201).json({ success: true, data: newOrder });
  } catch (error) {
    next(error);
  }
};
