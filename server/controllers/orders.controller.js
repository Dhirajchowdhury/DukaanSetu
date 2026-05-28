const { supabase } = require('../config/db');

/**
 * @desc  Place a new order (with delivery location and MOQ/stock checks)
 * @route POST /api/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { productId, quantity, notes, deliveryLocation } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'productId and quantity (>0) are required' });
    }

    const { data, error } = await supabase.rpc('place_order_tx', {
      p_buyer_id: req.user.id,
      p_product_id: productId,
      p_quantity: parseInt(quantity),
      p_delivery_location: deliveryLocation || null,
      p_notes: notes || null
    });

    if (error) throw error;

    if (!data.success) {
      return res.status(400).json({ message: data.message });
    }

    // Fetch the enriched order to return the same format
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select(`
        id, quantity, total_price, status, notes, delivery_location, created_at,
        wholesaler_products(product_name, price_per_unit, unit, category),
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email)
      `)
      .eq('id', data.order_id)
      .single();

    if (fetchErr) throw fetchErr;

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get orders placed by the current user (buying)
 * @route GET /api/orders/buying
 */
const getBuyingOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to   = from + parseInt(limit) - 1;

    let query = supabase
      .from('orders')
      .select(`
        *,
        wholesaler_products(id, product_name, price_per_unit, unit, category),
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email)
      `, { count: 'exact' })
      .eq('buyer_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      orders: data || [],
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get orders received by the current user (selling)
 * @route GET /api/orders/selling
 */
const getSellingOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to   = from + parseInt(limit) - 1;

    let query = supabase
      .from('orders')
      .select(`
        *,
        wholesaler_products(id, product_name, price_per_unit, unit, category),
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email)
      `, { count: 'exact' })
      .eq('seller_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      orders: data || [],
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get all orders (both buying & selling)
 * @route GET /api/orders
 */
const getOrders = async (req, res, next) => {
  try {
    const { role = 'all', status, page = 1, limit = 20 } = req.query;
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to   = from + parseInt(limit) - 1;

    let query = supabase
      .from('orders')
      .select(`
        *,
        wholesaler_products(product_name, price_per_unit, unit, category),
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (role === 'buyer') {
      query = query.eq('buyer_id', req.user.id);
    } else if (role === 'seller') {
      query = query.eq('seller_id', req.user.id);
    } else {
      query = query.or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`);
    }

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      orders: data || [],
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update order status (seller only, or buyer cancellation)
 * @route PUT /api/orders/:id
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const VALID = ['accepted', 'dispatched', 'delivered', 'cancelled'];

    if (!VALID.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID.join(', ')}` });
    }

    // Only the seller can update status (buyer can only cancel)
    const { data: existing } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ message: 'Order not found' });

    const isSeller = existing.seller_id === req.user.id;
    const isBuyer  = existing.buyer_id  === req.user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Buyers can only cancel pending orders
    if (isBuyer && !isSeller) {
      if (status !== 'cancelled' || existing.status !== 'pending') {
        return res.status(403).json({ message: 'Buyers can only cancel pending orders' });
      }
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', req.params.id)
      .select(`
        *,
        wholesaler_products(product_name, price_per_unit, unit, category),
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email)
      `)
      .single();

    if (error) throw error;
    res.json({ message: 'Order updated', order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getBuyingOrders,
  getSellingOrders,
  getOrders,
  updateOrderStatus
};
