const { supabase } = require('../config/db');

/**
 * @desc  Place a new order
 * @route POST /api/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { productId, quantity, notes } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'productId and quantity (>0) are required' });
    }

    // Fetch the listing to validate MOQ and compute price
    const { data: listing, error: listErr } = await supabase
      .from('wholesaler_products')
      .select('id, wholesaler_id, product_name, price_per_unit, moq, stock_available, unit')
      .eq('id', productId)
      .single();

    if (listErr || !listing) {
      return res.status(404).json({ message: 'Product listing not found' });
    }

    if (quantity < listing.moq) {
      return res.status(400).json({
        message: `Minimum order quantity is ${listing.moq} ${listing.unit || 'units'}`,
      });
    }

    if (quantity > listing.stock_available) {
      return res.status(400).json({
        message: `Only ${listing.stock_available} units available`,
      });
    }

    if (listing.wholesaler_id === req.user.id) {
      return res.status(400).json({ message: 'You cannot order your own listing' });
    }

    const total_price = parseFloat(listing.price_per_unit) * quantity;

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        buyer_id:    req.user.id,
        seller_id:   listing.wholesaler_id,
        product_id:  productId,
        quantity,
        total_price,
        notes:       notes || null,
        status:      'pending',
      })
      .select(`
        id, quantity, total_price, status, notes, created_at,
        wholesaler_products(product_name, price_per_unit, unit, category),
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get orders for the current user (as buyer OR seller)
 * @route GET /api/orders
 * @query role=buyer|seller|all (default: all)
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
      orders: data,
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
 * @desc  Update order status (seller only)
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

module.exports = { createOrder, getOrders, updateOrderStatus };
