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

    // Sales drop alert: compare this week vs last week
    const thisWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const lastWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: thisWeekOrders }, { count: lastWeekOrders }] = await Promise.all([
      supabase.from('orders')
        .select('*', { count: 'exact', head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .gte('created_at', thisWeekStart),
      supabase.from('orders')
        .select('*', { count: 'exact', head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .gte('created_at', lastWeekStart)
        .lt('created_at', thisWeekStart),
    ]);

    let salesDropAlert = null;
    if (lastWeekOrders > 0) {
      const dropPercent = ((lastWeekOrders - thisWeekOrders) / lastWeekOrders) * 100;
      if (dropPercent > 40) {
        salesDropAlert = {
          dropPercent: Math.round(dropPercent),
          thisWeek: thisWeekOrders,
          lastWeek: lastWeekOrders,
        };
      }
    }

    // Seasonal suggestions
    const { getCurrentSeasonalCategories } = require('../config/seasonalProducts');
    const seasonalCategories = getCurrentSeasonalCategories();
    const { data: seasonalProducts, error: seasonalErr } = await supabase
      .from('products')
      .select('id, product_name, quantity, unit, selling_price, categories!inner(name, icon)')
      .eq('user_id', userId)
      .in('categories.name', seasonalCategories)
      .limit(10);

    if (seasonalErr) console.error('Seasonal query error:', seasonalErr.message);

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
      salesDropAlert,
      seasonal: {
        month: new Date().getMonth() + 1,
        suggestedCategories: seasonalCategories,
        products: (seasonalProducts || []).map(p => ({
          id: p.id,
          productName: p.product_name,
          quantity: p.quantity,
          unit: p.unit,
          sellingPrice: p.selling_price,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Stock turnover rate per product
 * @route GET /api/analytics/turnover?days=30
 */
const getTurnover = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: products } = await supabase
      .from('products')
      .select('id, product_name, quantity, cost_price, selling_price')
      .eq('user_id', userId);

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, order_id')
      .in('product_id', (products || []).map(p => p.id));

    const { data: orders } = await supabase
      .from('orders')
      .select('id, created_at')
      .in('id', (orderItems || []).map(oi => oi.order_id))
      .gte('created_at', since)
      .neq('status', 'cancelled');

    const validOrderIds = new Set((orders || []).map(o => o.id));
    const unitsSoldMap = {};
    (orderItems || []).forEach(oi => {
      if (validOrderIds.has(oi.order_id)) {
        unitsSoldMap[oi.product_id] = (unitsSoldMap[oi.product_id] || 0) + (oi.quantity || 0);
      }
    });

    const result = (products || []).map(p => {
      const unitsSold = unitsSoldMap[p.id] || 0;
      const avgStock = p.quantity || 0;
      const turnoverRate = avgStock > 0 ? unitsSold / avgStock : 0;
      let flag = 'slow';
      if (turnoverRate >= 2) flag = 'fast';
      else if (turnoverRate >= 0.5) flag = 'normal';
      return {
        productId: p.id,
        productName: p.product_name,
        unitsSold,
        avgStock,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        flag,
      };
    });

    res.json({ turnover: result.sort((a, b) => a.turnoverRate - b.turnoverRate) });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Profit / loss graph data per month
 * @route GET /api/analytics/profit-loss?from=&to=
 */
const getProfitLoss = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const fromDate = req.query.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = req.query.to || new Date().toISOString();

    const { data: orders } = await supabase
      .from('orders')
      .select('id, created_at, total_price, status')
      .eq('seller_id', userId)
      .in('status', ['delivered', 'accepted'])
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: true });

    const orderIds = (orders || []).map(o => o.id);
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, product_id, quantity, price')
      .in('order_id', orderIds);

    const { data: products } = await supabase
      .from('products')
      .select('id, cost_price')
      .in('id', (items || []).map(i => i.product_id));

    const costMap = {};
    (products || []).forEach(p => { costMap[p.id] = parseFloat(p.cost_price || 0); });

    const monthlyMap = {};
    (orders || []).forEach(order => {
      const d = new Date(order.created_at);
      const key = `${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, cogs: 0, month: d.getMonth(), year: d.getFullYear() };
      monthlyMap[key].revenue += parseFloat(order.total_price || 0);
    });

    (items || []).forEach(item => {
      const order = (orders || []).find(o => o.id === item.order_id);
      if (!order) return;
      const d = new Date(order.created_at);
      const key = `${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].cogs += (item.quantity || 0) * (costMap[item.product_id] || 0);
      }
    });

    const result = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        cogs: Math.round(data.cogs * 100) / 100,
        grossProfit: Math.round((data.revenue - data.cogs) * 100) / 100,
      }))
      .sort((a, b) => a.year - b.year || a.month - b.month);

    res.json({ profitLoss: result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Smart restocking suggestions
 * @route GET /api/analytics/restock-suggestions
 */
const getRestockSuggestions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: products } = await supabase
      .from('products')
      .select('id, product_name, quantity, unit, category_id')
      .eq('user_id', userId);

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .in('product_id', (products || []).map(p => p.id));

    const { data: orders } = await supabase
      .from('orders')
      .select('id, created_at')
      .in('id', (orderItems || []).map(oi => oi.order_id))
      .gte('created_at', thirtyDaysAgo)
      .neq('status', 'cancelled');

    const validOrderIds = new Set((orders || []).map(o => o.id));
    const salesMap = {};
    (orderItems || []).forEach(oi => {
      if (validOrderIds.has(oi.order_id)) {
        salesMap[oi.product_id] = (salesMap[oi.product_id] || 0) + (oi.quantity || 0);
      }
    });

    const suggestions = [];
    for (const product of products || []) {
      const avgDailySales = (salesMap[product.id] || 0) / 30;
      if (avgDailySales <= 0) continue;
      const daysOfStockLeft = product.quantity / avgDailySales;
      if (daysOfStockLeft >= 7) continue;
      const suggestedQty = Math.ceil((avgDailySales * 30) - product.quantity);

      let bestSupplier = null;
      const { data: connections } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');
      const connectedIds = (connections || []).map(c => c.connected_user_id);
      if (connectedIds.length > 0) {
        const { data: supplierProducts } = await supabase
          .from('wholesaler_products')
          .select('id, product_name, price_per_unit, wholesaler_id, stock_available')
          .in('wholesaler_id', connectedIds)
          .ilike('product_name', `%${product.product_name}%`)
          .order('price_per_unit', { ascending: true })
          .limit(1);
        if (supplierProducts && supplierProducts.length > 0) {
          const sp = supplierProducts[0];
          const { data: supUser } = await supabase
            .from('users')
            .select('id, shop_name')
            .eq('id', sp.wholesaler_id)
            .single();
          bestSupplier = {
            supplierId: sp.wholesaler_id,
            shopName: supUser?.shop_name || 'Supplier',
            productName: sp.product_name,
            price: parseFloat(sp.price_per_unit || 0),
            stockAvailable: sp.stock_available,
          };
        }
      }

      suggestions.push({
        productId: product.id,
        productName: product.product_name,
        currentStock: product.quantity,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        daysOfStockLeft: Math.round(daysOfStockLeft * 10) / 10,
        suggestedOrderQty: Math.max(suggestedQty, 0),
        unit: product.unit,
        bestSupplier,
      });
    }

    res.json({ suggestions: suggestions.sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft) });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Customer retention analytics
 * @route GET /api/analytics/retention
 */
const getRetention = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await supabase
      .from('orders')
      .select('buyer_id, created_at, id, total_price')
      .eq('seller_id', userId)
      .gte('created_at', ninetyDaysAgo)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    const buyerOrderMap = {};
    (orders || []).forEach(o => {
      if (!buyerOrderMap[o.buyer_id]) buyerOrderMap[o.buyer_id] = [];
      buyerOrderMap[o.buyer_id].push(o);
    });

    const buyerIds = Object.keys(buyerOrderMap);

    const { data: buyers } = await supabase
      .from('users')
      .select('id, shop_name, email, phone_number')
      .in('id', buyerIds);

    const buyerMap = {};
    (buyers || []).forEach(b => { buyerMap[b.id] = b; });

    const repeat = [];
    const atRisk = [];
    const newBuyers = [];

    buyerIds.forEach(bid => {
      const buyerOrders = buyerOrderMap[bid];
      const totalSpend = buyerOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
      const lastOrderDate = buyerOrders[0].created_at;
      const orderCount = buyerOrders.length;
      const buyerInfo = { ...buyerMap[bid], totalOrders: orderCount, totalSpend, lastOrderDate };

      const firstOrderDate = buyerOrders[buyerOrders.length - 1].created_at;

      if (firstOrderDate >= thirtyDaysAgo && orderCount === 1) {
        newBuyers.push(buyerInfo);
      } else if (orderCount > 1 && new Date(lastOrderDate) >= new Date(thirtyDaysAgo)) {
        repeat.push(buyerInfo);
      } else if (new Date(lastOrderDate) < new Date(thirtyDaysAgo)) {
        atRisk.push(buyerInfo);
      }
    });

    res.json({
      summary: {
        repeatBuyers: repeat.length,
        atRiskBuyers: atRisk.length,
        newBuyers: newBuyers.length,
      },
      repeat: repeat.sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 20),
      atRisk: atRisk.sort((a, b) => new Date(a.lastOrderDate) - new Date(b.lastOrderDate)).slice(0, 20),
      newBuyers: newBuyers.sort((a, b) => new Date(b.lastOrderDate) - new Date(a.lastOrderDate)).slice(0, 20),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Producer insights — demand, top buyers, monthly production
 * @route GET /api/analytics/producer-insights
 */
const getProducerInsights = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Demand for my products — orders placed for this producer's products
    const { data: demandData } = await supabase
      .from('orders')
      .select('created_at, total_price, id')
      .eq('seller_id', userId)
      .neq('status', 'cancelled')
      .gte('created_at', sixMonthsAgo)
      .order('created_at', { ascending: true });

    const demandByMonth = {};
    (demandData || []).forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
      if (!demandByMonth[key]) demandByMonth[key] = { month: key, orders: 0, revenue: 0 };
      demandByMonth[key].orders += 1;
      demandByMonth[key].revenue += parseFloat(o.total_price || 0);
    });

    // 2. Top buyers
    const { data: topBuyerData } = await supabase
      .from('orders')
      .select('buyer_id, total_price')
      .eq('seller_id', userId)
      .neq('status', 'cancelled');

    const buyerTotals = {};
    (topBuyerData || []).forEach(o => {
      buyerTotals[o.buyer_id] = (buyerTotals[o.buyer_id] || 0) + parseFloat(o.total_price || 0);
    });
    const topBuyerIds = Object.entries(buyerTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const { data: topBuyers } = await supabase
      .from('users')
      .select('id, shop_name')
      .in('id', topBuyerIds);

    const topBuyersWithSpend = (topBuyers || []).map(b => ({
      buyerId: b.id,
      shopName: b.shop_name,
      totalSpend: buyerTotals[b.id] || 0,
    })).sort((a, b) => b.totalSpend - a.totalSpend);

    // 3. Monthly production trend — products added per month
    const { data: products } = await supabase
      .from('products')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', sixMonthsAgo)
      .order('created_at', { ascending: true });

    const productionByMonth = {};
    (products || []).forEach(p => {
      const d = new Date(p.created_at);
      const key = `${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
      if (!productionByMonth[key]) productionByMonth[key] = { month: key, count: 0 };
      productionByMonth[key].count += 1;
    });

    res.json({
      demandByMonth: Object.values(demandByMonth),
      topBuyers: topBuyersWithSpend,
      productionByMonth: Object.values(productionByMonth),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  getTurnover,
  getProfitLoss,
  getRestockSuggestions,
  getRetention,
  getProducerInsights,
};
