const { supabase } = require('../config/db');

/**
 * @desc  Get user notifications (low stock + expiring products)
 * @route GET /api/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const threshold = req.user.preferences?.lowStockThreshold ?? 10;
    const now       = new Date().toISOString();
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: lowStockProducts,  error: e1 },
      { data: expiringProducts,  error: e2 },
    ] = await Promise.all([
      supabase
        .from('products')
        .select('id, product_name, quantity, unit, updated_at, categories(name, icon)')
        .eq('user_id', userId)
        .lte('quantity', threshold)
        .limit(10),
      supabase
        .from('products')
        .select('id, product_name, expiry_date, updated_at, categories(name, icon)')
        .eq('user_id', userId)
        .gte('expiry_date', now)
        .lte('expiry_date', sevenDays)
        .limit(10),
    ]);

    if (e1) throw e1;
    if (e2) throw e2;

    const notifications = [
      ...(lowStockProducts || []).map(p => ({
        type:      'low_stock',
        productId: p.id,
        product:   { ...p, productName: p.product_name, categoryId: p.categories },
        message:   `${p.product_name} is low on stock (${p.quantity} ${p.unit} remaining)`,
        createdAt: p.updated_at,
      })),
      ...(expiringProducts || []).map(p => {
        const daysLeft = Math.ceil(
          (new Date(p.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return {
          type:      'expiring_soon',
          productId: p.id,
          product:   { ...p, productName: p.product_name, categoryId: p.categories },
          message:   `${p.product_name} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          createdAt: p.updated_at,
        };
      }),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications };
