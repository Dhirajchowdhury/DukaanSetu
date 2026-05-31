const { supabase } = require('../config/db');

/**
 * Fetch order items for a given order (Legacy helper, since order_items is not in db)
 */
async function getOrderItems(orderId) {
  return [];
}

/**
 * Enrich an order with its items constructed from single product columns
 */
async function enrichOrder(order) {
  if (!order) return null;

  let totalPrice = order.total_price;
  if ((!totalPrice || parseFloat(totalPrice) === 0) && order.wholesaler_products && order.quantity) {
    totalPrice = parseFloat(order.wholesaler_products.price_per_unit || 0) * order.quantity;
  }

  const item = {
    id: order.id,
    order_id: order.id,
    product_id: order.product_id,
    quantity: order.quantity,
    price: totalPrice && order.quantity ? parseFloat(totalPrice) / (order.quantity || 1) : 0,
    product: order.wholesaler_products || null
  };
  return { ...order, total_price: totalPrice, items: [item] };
}

/**
 * @desc  Place a new order (single product or multi-item)
 * @route POST /api/orders
 * body (single): { productId, quantity, notes, deliveryLocation }
 * body (multi):  { items: [{ productId, quantity }], notes, deliveryLocation }
 */
const createOrder = async (req, res, next) => {
  try {
    const { items, productId, quantity, notes, deliveryLocation } = req.body;
    const orderItems = items || (productId ? [{ productId, quantity: quantity || 1 }] : []);

    if (!orderItems.length) {
      return res.status(400).json({ message: 'Provide items array or productId+quantity' });
    }

    // Since our database uses the single-product schema and has no order_items table,
    // we process the first item as a single-product order.
    const firstItem = orderItems[0];
    const { data: product, error: pErr } = await supabase
      .from('wholesaler_products')
      .select('id, wholesaler_id, product_name, price_per_unit, stock_available, moq, unit, category')
      .eq('id', firstItem.productId)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!product) {
      return res.status(400).json({ message: 'Product not found' });
    }

    const sellerId = product.wholesaler_id;
    if (sellerId === req.user.id) {
      return res.status(400).json({ message: 'Cannot order your own products' });
    }

    // Verify connection is accepted
    const [u1, u2] = [req.user.id, sellerId].sort();
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!conn) {
      return res.status(403).json({ message: 'Must have an accepted connection to place an order' });
    }

    const qty = parseInt(firstItem.quantity) || 1;
    if (qty < product.moq) {
      return res.status(400).json({
        message: `${product.product_name} minimum order is ${product.moq}`,
      });
    }
    if (qty > product.stock_available) {
      return res.status(400).json({
        message: `${product.product_name} only ${product.stock_available} in stock`,
      });
    }

    const totalPrice = parseFloat(product.price_per_unit || 0) * qty;

    // Create the order directly on single product columns
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        buyer_id: req.user.id,
        seller_id: sellerId,
        product_id: product.id,
        quantity: qty,
        total_price: totalPrice,
        delivery_location: deliveryLocation || null,
        notes: notes || null,
        status: 'pending',
      })
      .select(`
        *,
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email),
        wholesaler_products:wholesaler_products!product_id(id, product_name, price_per_unit, unit, category)
      `)
      .single();

    if (oErr) throw oErr;

    // Decrement stock
    await supabase
      .from('wholesaler_products')
      .update({ stock_available: product.stock_available - qty })
      .eq('id', product.id);

    const enriched = await enrichOrder(order);
    res.status(201).json({ message: 'Order placed successfully', order: enriched });
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
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('orders')
      .select(`
        *,
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email),
        wholesaler_products:wholesaler_products!product_id(id, product_name, price_per_unit, unit, category)
      `, { count: 'exact' })
      .eq('buyer_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    const orders = await Promise.all((data || []).map(enrichOrder));

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
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
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('orders')
      .select(`
        *,
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email),
        wholesaler_products:wholesaler_products!product_id(id, product_name, price_per_unit, unit, category)
      `, { count: 'exact' })
      .eq('seller_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    const orders = await Promise.all((data || []).map(enrichOrder));

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
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
 * @desc  Get all orders where user is buyer or seller
 * @route GET /api/orders
 */
const getOrders = async (req, res, next) => {
  try {
    const { role = 'all', status, page = 1, limit = 20 } = req.query;
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('orders')
      .select(`
        *,
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email),
        wholesaler_products:wholesaler_products!product_id(id, product_name, price_per_unit, unit, category)
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

    const orders = await Promise.all((data || []).map(enrichOrder));

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
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
 * @desc  Update order status (seller: accept/dispatch/deliver, buyer: cancel)
 * @route PUT /api/orders/:id
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const VALID = ['accepted', 'rejected', 'dispatched', 'delivered', 'cancelled'];

    if (!VALID.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID.join(', ')}` });
    }

    const { data: existing } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ message: 'Order not found' });

    const isSeller = existing.seller_id === req.user.id;
    const isBuyer = existing.buyer_id === req.user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Seller flow
    if (isSeller) {
      if (status === 'rejected' && existing.status !== 'pending') {
        return res.status(400).json({ message: 'Can only reject pending orders' });
      }
      if (status === 'accepted' && existing.status !== 'pending') {
        return res.status(400).json({ message: 'Can only accept pending orders' });
      }
      if (status === 'dispatched' && existing.status !== 'accepted') {
        return res.status(400).json({ message: 'Can only dispatch accepted orders' });
      }
      if (status === 'delivered' && existing.status !== 'dispatched') {
        return res.status(400).json({ message: 'Can only deliver dispatched orders' });
      }
    }

    // Buyer can only cancel pending orders
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
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email),
        wholesaler_products:wholesaler_products!product_id(id, product_name, price_per_unit, unit, category)
      `)
      .single();

    if (error) throw error;

    const enriched = await enrichOrder(order);
    res.json({ message: 'Order updated', order: enriched });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getBuyingOrders,
  getSellingOrders,
  getOrders,
  updateOrderStatus,
};
