const { supabase } = require('../config/db');

const getProductRanking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orderItemsData, error: orderErr } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        price,
        order:orders!order_id(buyer_id, seller_id, created_at, status)
      `)
      .in('order.status', ['delivered', 'accepted', 'dispatched'])
      .gte('order.created_at', thirtyDaysAgo);

    if (orderErr) throw orderErr;

    const productSales = {};
    const productLatest = {};

    (orderItemsData || []).forEach(item => {
      if (item.order && (item.order.buyer_id === userId || item.order.seller_id === userId)) {
        const pid = item.product_id;
        productSales[pid] = (productSales[pid] || 0) + (item.quantity || 0);
        if (!productLatest[pid] || item.order.created_at > productLatest[pid]) {
          productLatest[pid] = item.order.created_at;
        }
      }
    });

    const { data: userProducts, error: prodErr } = await supabase
      .from('wholesaler_products')
      .select('id, product_name, category, price_per_unit, stock_available, unit, created_at')
      .eq('wholesaler_id', userId);

    if (prodErr) throw prodErr;

    const productMap = {};
    (userProducts || []).forEach(p => {
      productMap[p.id] = p;
    });

    const ranked = Object.entries(productSales)
      .filter(([pid]) => productMap[pid])
      .map(([pid, totalSold]) => ({
        productId: pid,
        productName: productMap[pid].product_name,
        category: productMap[pid].category,
        pricePerUnit: productMap[pid].price_per_unit,
        stockAvailable: productMap[pid].stock_available,
        unit: productMap[pid].unit,
        totalSold,
        lastOrderDate: productLatest[pid] || null,
      }))
      .sort((a, b) => b.totalSold - a.totalSold);

    const soldProductIds = new Set(ranked.map(r => r.productId));

    const slowMovers = (userProducts || [])
      .filter(p => !soldProductIds.has(p.id))
      .map(p => {
        const daysSinceLastOrder = p.created_at
          ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          productId: p.id,
          productName: p.product_name,
          category: p.category,
          pricePerUnit: p.price_per_unit,
          stockAvailable: p.stock_available,
          unit: p.unit,
          totalSold: 0,
          daysSinceLastOrder,
          daysSinceCreated: Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        };
      })
      .sort((a, b) => (b.daysSinceCreated || 0) - (a.daysSinceCreated || 0));

    res.json({
      mostSold: ranked,
      leastSold: slowMovers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProductRanking };
