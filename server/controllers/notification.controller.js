const Product = require('../models/Product');

/**
 * @desc    Get user notifications (low stock + expiring products)
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get low stock products
    const lowStockProducts = await Product.find({
      userId,
      quantity: { $lte: req.user.preferences.lowStockThreshold },
    }).populate('categoryId', 'name icon').limit(10);

    // Get expiring products (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringProducts = await Product.find({
      userId,
      expiryDate: { $gte: new Date(), $lte: sevenDaysFromNow },
    }).populate('categoryId', 'name icon').limit(10);

    const notifications = [
      ...lowStockProducts.map(p => ({
        type: 'low_stock',
        product: p,
        message: `${p.productName} is low on stock (${p.quantity} ${p.unit} remaining)`,
        createdAt: p.updatedAt,
      })),
      ...expiringProducts.map(p => {
        const daysLeft = Math.ceil((new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          type: 'expiring_soon',
          product: p,
          message: `${p.productName} expires in ${daysLeft} days`,
          createdAt: p.updatedAt,
        };
      }),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
};
