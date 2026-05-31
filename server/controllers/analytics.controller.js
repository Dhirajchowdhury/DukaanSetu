const { supabase } = require('../config/db');

/**
 * @desc  Marketplace analytics dashboard data
 * @route GET /api/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().split('T')[0];

    const [
      { count: totalOrders },
      { count: pendingOrders },
      { count: completedOrders },
      { count: buyingOrders },
      { count: sellingOrders },
      { count: totalListings },
      { count: activeListings },
      { count: totalConnections },
      { count: pendingConnections },
      { data: orderValueData },
      { data: recentOrders },
    ] = await Promise.all([
      // Total orders involving this user
      supabase.from('orders')
        .select('*', { count: 'exact', head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),

      // Pending orders (as seller)
      supabase.from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .eq('status', 'pending'),

      // Completed orders (delivered)
      supabase.from('orders')
        .select('*', { count: 'exact', head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .eq('status', 'delivered'),

      // As buyer
      supabase.from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', userId),

      // As seller
      supabase.from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId),

      // Total wholesaler listings
      supabase.from('wholesaler_products')
        .select('*', { count: 'exact', head: true })
        .eq('wholesaler_id', userId),

      // Active listings (stock > 0)
      supabase.from('wholesaler_products')
        .select('*', { count: 'exact', head: true })
        .eq('wholesaler_id', userId)
        .gt('stock_available', 0),

      // Connections
      supabase.from('connections')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`),

      // Pending connection requests (incoming)
      supabase.from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('connected_user_id', userId)
        .eq('status', 'pending'),

      // Total order value (as seller, completed)
      supabase.from('orders')
        .select('id, total_price')
        .eq('seller_id', userId)
        .in('status', ['delivered', 'accepted']),

      // Recent orders (last 5)
      supabase.from('orders')
        .select(`
          id, status, total_price, created_at,
          buyer:users!buyer_id(id, shop_name),
          seller:users!seller_id(id, shop_name)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    // Calculate revenue from completed/accepted orders
    const totalRevenue = (orderValueData || []).reduce(
      (sum, o) => sum + parseFloat(o.total_price || 0), 0
    );

    res.json({
      summary: {
        totalOrders,
        pendingOrders,
        completedOrders,
        buyingOrders,
        sellingOrders,
        totalListings,
        activeListings,
        totalConnections,
        pendingConnections,
        totalRevenue,
      },
      recentOrders: recentOrders || [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics };
