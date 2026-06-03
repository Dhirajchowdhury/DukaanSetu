const { supabase } = require('../config/db');

const priceCompare = async (req, res, next) => {
  try {
    const { productName } = req.query;
    if (!productName) {
      return res.status(400).json({ message: 'productName query param is required' });
    }

    const { data: connections } = await supabase
      .from('connections')
      .select('connected_user_id')
      .eq('user_id', req.user.id)
      .eq('status', 'accepted');

    const connectedIds = (connections || []).map(c => c.connected_user_id);
    if (connectedIds.length === 0) {
      return res.json({ results: [] });
    }

    const { data: supplierProducts } = await supabase
      .from('wholesaler_products')
      .select('id, wholesaler_id, product_name, price_per_unit, stock_available, unit, category')
      .in('wholesaler_id', connectedIds)
      .ilike('product_name', `%${productName}%`)
      .gt('stock_available', 0)
      .order('price_per_unit', { ascending: true });

    if (!supplierProducts || supplierProducts.length === 0) {
      return res.json({ results: [] });
    }

    const supplierIds = [...new Set(supplierProducts.map(p => p.wholesaler_id))];

    const { data: suppliers } = await supabase
      .from('users')
      .select('id, shop_name, city, state, latitude, longitude')
      .in('id', supplierIds);

    const supplierMap = {};
    (suppliers || []).forEach(s => { supplierMap[s.id] = s; });

    // Get ratings for suppliers
    const { data: ratings } = await supabase
      .from('supplier_ratings')
      .select('supplier_id, rating')
      .in('supplier_id', supplierIds);

    const ratingMap = {};
    (ratings || []).forEach(r => {
      if (!ratingMap[r.supplier_id]) ratingMap[r.supplier_id] = [];
      ratingMap[r.supplier_id].push(r.rating);
    });

    const results = supplierProducts.map(p => {
      const s = supplierMap[p.wholesaler_id] || {};
      const productRatings = ratingMap[p.wholesaler_id] || [];
      const avgRating = productRatings.length > 0
        ? productRatings.reduce((a, b) => a + b, 0) / productRatings.length
        : 0;

      return {
        supplierId: p.wholesaler_id,
        shopName: s.shop_name || 'Supplier',
        city: s.city,
        state: s.state,
        productName: p.product_name,
        price: parseFloat(p.price_per_unit || 0),
        stockAvailable: p.stock_available,
        unit: p.unit,
        category: p.category,
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings: productRatings.length,
      };
    });

    res.json({
      results,
      cheapest: results.length > 0 ? results[0] : null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { priceCompare };
