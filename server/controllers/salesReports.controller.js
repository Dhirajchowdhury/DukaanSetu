const { supabase } = require('../config/db');

const getSalesReports = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = 'daily', from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, created_at, total_price, status, buyer_id,
        buyer:users!buyer_id(id, shop_name)
      `)
      .eq('seller_id', userId)
      .in('status', ['delivered', 'accepted'])
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: true });

    const periods = {};
    (orders || []).forEach(order => {
      const d = new Date(order.created_at);
      let key;
      if (period === 'weekly') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = d.toISOString().split('T')[0];
      }

      if (!periods[key]) {
        periods[key] = { period: key, orders: 0, revenue: 0, buyerSet: new Set(), topProductSales: {} };
      }
      periods[key].orders += 1;
      periods[key].revenue += parseFloat(order.total_price || 0);
      periods[key].buyerSet.add(order.buyer_id);
      periods[key].topProductSales[order.id] = (periods[key].topProductSales[order.id] || 0) + 1;
    });

    // Fetch order items for top product detection
    const orderIds = (orders || []).map(o => o.id);
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, product_id, quantity')
      .in('order_id', orderIds);

    const { data: products } = await supabase
      .from('products')
      .select('id, product_name')
      .in('id', (items || []).map(i => i.product_id));

    const productNames = {};
    (products || []).forEach(p => { productNames[p.id] = p.product_name; });

    const periodResults = Object.values(periods).map(p => {
      const avgOrderValue = p.orders > 0 ? p.revenue / p.orders : 0;
      return {
        period: p.period,
        totalOrders: p.orders,
        totalRevenue: Math.round(p.revenue * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        uniqueBuyers: p.buyerSet.size,
      };
    });

    // Top product overall
    const productSales = {};
    (items || []).forEach(item => {
      if (orderIds.includes(item.order_id)) {
        productSales[item.product_id] = (productSales[item.product_id] || 0) + (item.quantity || 0);
      }
    });
    const topProductEntry = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
    const topProduct = topProductEntry
      ? { productId: topProductEntry[0], productName: productNames[topProductEntry[0]] || 'Unknown', totalSold: topProductEntry[1] }
      : null;

    // Top buyer overall
    const buyerSpend = {};
    (orders || []).forEach(o => {
      buyerSpend[o.buyer_id] = (buyerSpend[o.buyer_id] || 0) + parseFloat(o.total_price || 0);
    });
    const topBuyerEntry = Object.entries(buyerSpend).sort((a, b) => b[1] - a[1])[0];
    const topBuyerData = topBuyerEntry ? await supabase.from('users').select('id, shop_name').eq('id', topBuyerEntry[0]).single() : null;
    const topBuyer = topBuyerData?.data
      ? { buyerId: topBuyerData.data.id, shopName: topBuyerData.data.shop_name, totalSpend: buyerSpend[topBuyerEntry[0]] }
      : null;

    res.json({
      periodResults,
      summary: { topProduct, topBuyer },
      period,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSalesReports };
