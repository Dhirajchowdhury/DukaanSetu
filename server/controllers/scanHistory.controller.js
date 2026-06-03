const { supabase } = require('../config/db');

const getScanHistory = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('scan_history')
      .select(`
        *,
        user:users!user_id(id, shop_name, email),
        product:products!product_id(id, product_name)
      `, { count: 'exact' })
      .order('scanned_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      scans: (data || []).map(s => ({
        id: s.id,
        userId: s.user_id,
        user: s.user ? { id: s.user.id, shopName: s.user.shop_name, email: s.user.email } : null,
        productId: s.product_id,
        product: s.product ? { id: s.product.id, productName: s.product.product_name } : null,
        action: s.action,
        scannedAt: s.scanned_at,
      })),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getScanHistory };
