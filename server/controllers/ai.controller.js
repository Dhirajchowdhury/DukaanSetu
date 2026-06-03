const { supabase } = require('../config/db');
const { askGemini, askGeminiJSON } = require('../services/gemini.service');
const cache = require('../services/cache.service');

function makeCacheKey(userId, label) {
  return cache.getCacheKey(userId, label);
}

// ── FEATURE #45 — Demand Prediction ──────────────────────────────────────────
const demandForecast = async (req, res, next) => {
  try {
    const cacheKey = makeCacheKey(req.user.id, 'demandForecast');
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ forecast: cached });

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        price,
        created_at,
        product:wholesaler_products!product_id(product_name)
      `)
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!orderItems || orderItems.length === 0) {
      return res.json({ forecast: [] });
    }

    const weeklyMap = {};
    orderItems.forEach(item => {
      const week = getWeekLabel(item.created_at);
      const key = `${item.product_id}:${week}`;
      if (!weeklyMap[key]) {
        weeklyMap[key] = { productId: item.product_id, productName: item.product?.product_name || 'Unknown', week, totalQty: 0 };
      }
      weeklyMap[key].totalQty += item.quantity || 0;
    });

    const weeklyData = Object.values(weeklyMap);
    const productGroups = {};
    weeklyData.forEach(w => {
      if (!productGroups[w.productId]) {
        productGroups[w.productId] = { productName: w.productName, weeks: [] };
      }
      productGroups[w.productId].weeks.push({ week: w.week, qty: w.totalQty });
    });

    const productSummaries = Object.values(productGroups).map(p => {
      const weekStr = p.weeks.map(w => `${w.week}: ${w.qty} units`).join(', ');
      return `${p.productName}: [${weekStr}]`;
    }).join('\n');

    const prompt = `Given these weekly sales data for each product over the last 90 days:\n${productSummaries}\n\nPredict the next 4 weeks demand per product. Return JSON: [{productName, week1, week2, week3, week4, trend: "up"|"down"|"stable"}]`;

    const result = await askGeminiJSON(prompt);
    if (!result) return res.json({ forecast: [] });

    cache.set(cacheKey, result);
    res.json({ forecast: result });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #66 — Smart Demand Forecast (deep) ──────────────────────────────
const deepDemandForecast = async (req, res, next) => {
  try {
    const cacheKey = makeCacheKey(req.user.id, 'deepDemandForecast');
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ forecast: cached });

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        created_at,
        product:wholesaler_products!product_id(product_name)
      `)
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const { data: products } = await supabase
      .from('wholesaler_products')
      .select('id, product_name, stock_available, unit, expiry_date, category')
      .eq('wholesaler_id', req.user.id);

    if (!orderItems || orderItems.length === 0 || !products || products.length === 0) {
      return res.json({ forecast: [] });
    }

    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    const weeklyMap = {};
    orderItems.forEach(item => {
      const week = getWeekLabel(item.created_at);
      const key = `${item.product_id}:${week}`;
      if (!weeklyMap[key]) {
        weeklyMap[key] = { productId: item.product_id, productName: item.product?.product_name || 'Unknown', week, totalQty: 0 };
      }
      weeklyMap[key].totalQty += item.quantity || 0;
    });

    const weeklyData = Object.values(weeklyMap);
    const productGroups = {};
    weeklyData.forEach(w => {
      if (!productGroups[w.productId]) {
        productGroups[w.productId] = { productName: w.productName, weeks: [] };
      }
      productGroups[w.productId].weeks.push({ week: w.week, qty: w.totalQty });
    });

    const now = new Date();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const currentMonth = monthNames[now.getMonth()];

    const productContexts = Object.keys(productGroups).map(pid => {
      const pDef = productMap[pid];
      const salesData = productGroups[pid].weeks.map(w => `${w.week}: ${w.qty} units`).join(', ');
      const stockInfo = pDef ? `Current stock: ${pDef.stock_available} ${pDef.unit || 'units'}` : 'Current stock: unknown';
      const expiryInfo = pDef?.expiry_date ? `Expiry date: ${pDef.expiry_date}` : 'No expiry date set';
      return `${productGroups[pid].productName} — ${stockInfo}, ${expiryInfo}. Weekly sales: [${salesData}]`;
    }).join('\n');

    const prompt = `Current month: ${currentMonth}. Consider seasonal demand patterns for this month.\n\nProduct data:\n${productContexts}\n\nPredict next 4 weeks demand per product factoring in current stock, expiry dates, and the current season. Return JSON: [{productName, week1, week2, week3, week4, trend: "up"|"down"|"stable", restockRecommended: true|false, urgency: "high"|"medium"|"low"}]`;

    const result = await askGeminiJSON(prompt);
    if (!result) return res.json({ forecast: [] });

    cache.set(cacheKey, result);
    res.json({ forecast: result });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #68 — Smart Bundle Suggestions ──────────────────────────────────
const bundleSuggestions = async (req, res, next) => {
  try {
    const cacheKey = makeCacheKey(req.user.id, 'bundleSuggestions');
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ bundles: cached });

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        product:wholesaler_products!product_id(product_name, price_per_unit, category)
      `)
      .gte('created_at', ninetyDaysAgo);

    if (error) throw error;
    if (!orderItems || orderItems.length === 0) {
      return res.json({ bundles: [] });
    }

    const salesMap = {};
    orderItems.forEach(item => {
      const pid = item.product_id;
      if (!salesMap[pid]) {
        salesMap[pid] = {
          name: item.product?.product_name || 'Unknown',
          category: item.product?.category || 'General',
          price: item.product?.price_per_unit || 0,
          qty: 0,
        };
      }
      salesMap[pid].qty += item.quantity || 0;
    });

    const topProducts = Object.values(salesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 20)
      .map(p => `${p.name} (${p.category}) — ₹${p.price}/unit, sold ${p.qty} units`)
      .join('\n');

    const prompt = `Top selling products:\n${topProducts}\n\nSuggest 5 product bundles that would make sense for a retail shop to sell together. Consider complementary products, price points, and seasonal relevance. Return JSON: [{bundleName, products: [{name, qty}], suggestedPrice, reason}]`;

    const result = await askGeminiJSON(prompt);
    if (!result) return res.json({ bundles: [] });

    cache.set(cacheKey, result);
    res.json({ bundles: result });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #69 — Festival-Based Product Suggestions ────────────────────────
const festivalSuggestions = async (req, res, next) => {
  try {
    const cacheKey = makeCacheKey(req.user.id, 'festivalSuggestions');
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ festivals: cached });

    const { data: profile } = await supabase
      .from('users')
      .select('city')
      .eq('id', req.user.id)
      .single();

    const city = profile?.city || 'Dhaka';
    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `Today is ${today}. Location: ${city}, Bangladesh. List upcoming festivals or occasions in the next 30 days relevant to this location. For each festival, suggest 5 products a small retail shop should stock. Return JSON: [{festival, daysAway, products: [{name, reason}]}]`;

    const result = await askGeminiJSON(prompt);
    if (!result) return res.json({ festivals: [] });

    cache.set(cacheKey, result);
    res.json({ festivals: result });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #70 — Waste Reduction Suggestions ───────────────────────────────
const wasteReduction = async (req, res, next) => {
  try {
    const cacheKey = makeCacheKey(req.user.id, 'wasteReduction');
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ suggestions: cached });

    const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: products } = await supabase
      .from('wholesaler_products')
      .select('id, product_name, stock_available, unit, expiry_date')
      .eq('wholesaler_id', req.user.id)
      .gt('stock_available', 0)
      .order('expiry_date', { ascending: true });

    if (!products || products.length === 0) {
      return res.json({ suggestions: [] });
    }

    const expiringSoon = products.filter(p => p.expiry_date && p.expiry_date <= fourteenDaysFromNow);
    if (expiringSoon.length === 0) {
      return res.json({ suggestions: [] });
    }

    const productList = expiringSoon.map(p =>
      `${p.product_name}: ${p.stock_available} ${p.unit || 'units'}, expires ${new Date(p.expiry_date).toLocaleDateString('en-IN')}`
    ).join('\n');

    const prompt = `These products are expiring soon:\n${productList}\n\nSuggest practical ways to reduce waste — discounts, bundles, return to supplier, or donate. Return JSON: [{productName, suggestion, action: "discount"|"bundle"|"return"|"donate", urgency}]`;

    const result = await askGeminiJSON(prompt);
    if (!result) return res.json({ suggestions: [] });

    cache.set(cacheKey, result);
    res.json({ suggestions: result });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #74 — Smart Supplier Recommendation ─────────────────────────────
const supplierRecommendation = async (req, res, next) => {
  try {
    const { productCategory } = req.query;
    if (!productCategory) {
      return res.status(400).json({ message: 'productCategory query param is required' });
    }

    const { data: connections } = await supabase
      .from('connections')
      .select('connected_user_id')
      .eq('user_id', req.user.id)
      .eq('status', 'accepted');

    const connectedIds = (connections || []).map(c => c.connected_user_id);
    if (connectedIds.length === 0) {
      return res.json({ candidates: [], recommendation: null });
    }

    const { data: suppliers } = await supabase
      .from('users')
      .select('id, shop_name, city, state, latitude, longitude')
      .in('id', connectedIds);

    const { data: supplierProducts } = await supabase
      .from('wholesaler_products')
      .select('wholesaler_id, price_per_unit, product_name, category')
      .in('wholesaler_id', connectedIds)
      .ilike('category', `%${productCategory}%`);

    if (!supplierProducts || supplierProducts.length === 0) {
      return res.json({ candidates: [], recommendation: null });
    }

    const minPrices = {};
    supplierProducts.forEach(p => {
      const pid = p.wholesaler_id;
      if (!minPrices[pid] || p.price_per_unit < minPrices[pid].price) {
        minPrices[pid] = { price: p.price_per_unit, productName: p.product_name };
      }
    });

    const supplierMap = {};
    (suppliers || []).forEach(s => { supplierMap[s.id] = s; });

    const { data: ratings } = await supabase
      .from('supplier_ratings')
      .select('supplier_id, rating')
      .in('supplier_id', connectedIds);

    const ratingMap = {};
    (ratings || []).forEach(r => {
      if (!ratingMap[r.supplier_id]) ratingMap[r.supplier_id] = [];
      ratingMap[r.supplier_id].push(r.rating);
    });

    const { data: pastOrders } = await supabase
      .from('orders')
      .select('seller_id')
      .eq('buyer_id', req.user.id)
      .in('seller_id', connectedIds);

    const orderCountMap = {};
    (pastOrders || []).forEach(o => {
      orderCountMap[o.seller_id] = (orderCountMap[o.seller_id] || 0) + 1;
    });

    const candidates = Object.keys(minPrices).map(id => {
      const s = supplierMap[id] || {};
      const r = ratingMap[id] || [];
      const avgRating = r.length > 0 ? (r.reduce((a, b) => a + b, 0) / r.length) : 0;
      return {
        id,
        shopName: s.shop_name || 'Supplier',
        city: s.city,
        state: s.state,
        minPrice: minPrices[id].price,
        productName: minPrices[id].productName,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: r.length,
        pastOrderCount: orderCountMap[id] || 0,
      };
    }).sort((a, b) => b.avgRating - a.avgRating).slice(0, 5);

    if (candidates.length === 0) {
      return res.json({ candidates: [], recommendation: null });
    }

    const candidateStr = candidates.map(c =>
      `${c.shopName} from ${c.city}, ${c.state} — rating: ${c.avgRating}/5, price: ₹${c.minPrice}, past orders: ${c.pastOrderCount}`
    ).join('\n');

    const prompt = `A shop owner needs to order from the "${productCategory}" category. Here are 5 candidate suppliers:\n${candidateStr}\n\nRecommend the best one and explain why in 2 sentences. Return JSON: {recommendedSupplierId, reason}`;

    const recommendation = await askGeminiJSON(prompt);

    res.json({
      candidates,
      recommendation: recommendation || null,
    });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #67 — AI Chat Assistant ─────────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const { data: products } = await supabase
      .from('wholesaler_products')
      .select('id, stock_available')
      .eq('wholesaler_id', req.user.id);

    const totalProducts = products ? products.length : 0;
    const lowStockCount = products ? products.filter(p => p.stock_available !== null && p.stock_available < 10).length : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, status, total_price')
      .eq('seller_id', req.user.id)
      .gte('created_at', thirtyDaysAgo);

    const pendingOrders = recentOrders ? recentOrders.filter(o => o.status === 'pending' || o.status === 'accepted').length : 0;
    const revenue30Days = recentOrders ? recentOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0) : 0;

    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        product:wholesaler_products!product_id(product_name)
      `)
      .gte('created_at', thirtyDaysAgo);

    const productSales = {};
    (orderItems || []).forEach(item => {
      const name = item.product?.product_name || 'Unknown';
      productSales[name] = (productSales[name] || 0) + (item.quantity || 0);
    });
    const topProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    const context = {
      totalProducts,
      lowStockCount,
      pendingOrders,
      topProduct,
      revenue30Days: `₹${revenue30Days.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    };

    const systemPrompt = `You are a smart business assistant for a small shop owner in Bangladesh. You have access to their inventory and sales context. Help them make better decisions. Be concise and practical.\n\nCurrent business context:\n- Total products: ${context.totalProducts}\n- Low stock items: ${context.lowStockCount}\n- Pending orders: ${context.pendingOrders}\n- Top selling product: ${context.topProduct}\n- Revenue (last 30 days): ${context.revenue30Days}`;

    const fullPrompt = `${systemPrompt}\n\nShop owner's question: ${message}\n\nProvide a helpful, concise response.`;

    const result = await askGemini(fullPrompt);
    if (!result) return res.json({ reply: 'AI suggestions unavailable — try again.' });

    res.json({ reply: result });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #53 — Personalized Offers for Buyers ────────────────────────────
const personalizedOffers = async (req, res, next) => {
  try {
    const { buyerId } = req.params;
    if (!buyerId) return res.status(400).json({ message: 'buyerId is required' });

    const cacheKey = makeCacheKey(buyerId, 'personalizedOffers');
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ offers: cached });

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_price, created_at')
      .eq('seller_id', req.user.id)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!orders || orders.length === 0) {
      return res.json({ offers: [] });
    }

    const orderIds = orders.map(o => o.id);
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        order_id,
        quantity,
        price,
        product:wholesaler_products!product_id(product_name, category)
      `)
      .in('order_id', orderIds);

    const totalSpend = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

    const productList = (orderItems || []).map(item =>
      `${item.product?.product_name || 'Unknown'} (${item.product?.category || 'General'}) x${item.quantity} — ₹${item.price}`
    ).join('\n');

    const orderSummary = orders.map(o =>
      `Order ${o.id.slice(0, 8)}: ₹${o.total_price} on ${new Date(o.created_at).toLocaleDateString('en-IN')}`
    ).join('\n');

    const prompt = `This B2B buyer has spent ₹${totalSpend} total across ${orders.length} orders.\n\nOrder history:\n${orderSummary}\n\nProducts ordered:\n${productList}\n\nSuggest 3 personalized offers the seller could make to retain this buyer. Consider their purchase history and spending level. Return JSON: [{offerTitle, description, discount, targetProduct}]`;

    const result = await askGeminiJSON(prompt);
    if (!result) return res.json({ offers: [] });

    cache.set(cacheKey, result);
    res.json({ offers: result });
  } catch (error) {
    next(error);
  }
};

// ── helpers ──────────────────────────────────────────────────────────────────
function getWeekLabel(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d - start;
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

module.exports = {
  demandForecast,
  deepDemandForecast,
  bundleSuggestions,
  festivalSuggestions,
  wasteReduction,
  supplierRecommendation,
  chat,
  personalizedOffers,
};
