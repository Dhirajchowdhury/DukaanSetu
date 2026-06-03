const { supabase } = require('../config/db');
const { sendOrderNotification } = require('../services/email.service');
const { sendOrderSMS, sendWhatsApp } = require('../services/sms.service');
const { getIO } = require('../services/socket');

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

  try {
    // Try to fetch items from the order_items table
    const { data: items, error } = await supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        quantity,
        price,
        product:wholesaler_products!product_id(id, product_name, price_per_unit, unit, category)
      `)
      .eq('order_id', order.id);

    if (!error && items && items.length > 0) {
      // Calculate total price based on the actual items sum
      const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.price || 0) * (item.quantity || 0), 0);
      return { 
        ...order, 
        total_price: totalPrice, 
        items: items.map(item => ({
          id: item.id,
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          product: item.product
        }))
      };
    }
  } catch (err) {
    console.error('Error fetching order items:', err);
  }

  // Fallback for single-product legacy orders
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
    const newStock = product.stock_available - qty;
    await supabase
      .from('wholesaler_products')
      .update({ stock_available: newStock })
      .eq('id', product.id);

    try {
      const socketIO = getIO();
      if (socketIO) {
        socketIO.emit('stock:updated', { productId: product.id, newStock, userId: req.user.id });
      }
    } catch (e) { /* socket not ready */ }

    const enriched = await enrichOrder(order);

    // Notify seller of new order
    if (order.seller?.email) {
      sendOrderNotification(order.seller.email, order.id, `New order received from ${order.buyer?.shop_name || 'a buyer'} — ₹${totalPrice}`);
    }
    if (order.seller?.phone_number) {
      sendWhatsApp(order.seller.phone_number, `New order received from ${order.buyer?.shop_name || 'a buyer'} — ₹${totalPrice}`);
    }

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

    // Notify buyer and seller about status change
    const statusMsg = `Your order #${order.id.slice(0, 8)} status changed to ${status}`;
    if (order.buyer?.email) {
      sendOrderNotification(order.buyer.email, order.id, statusMsg);
    }
    if (order.seller?.email) {
      sendOrderNotification(order.seller.email, order.id, statusMsg);
    }
    if (order.buyer?.phone_number) {
      sendOrderSMS(order.buyer.phone_number, order.id, statusMsg);
    }
    if (order.seller?.phone_number) {
      sendOrderSMS(order.seller.phone_number, order.id, statusMsg);
    }
    // WhatsApp notifications
    if (order.buyer?.phone_number) {
      sendWhatsApp(order.buyer.phone_number, statusMsg);
    }
    if (order.seller?.phone_number) {
      sendWhatsApp(order.seller.phone_number, statusMsg);
    }

    res.json({ message: 'Order updated', order: enriched });
  } catch (error) {
    next(error);
  }
};

const createOrderBulk = async (req, res, next) => {
  try {
    const { supplierId, items, notes, deliveryLocation } = req.body;

    if (!supplierId) {
      return res.status(400).json({ message: 'Supplier ID is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array cannot be empty' });
    }

    // Try calling the PostgreSQL transaction function first
    const { data: txResult, error: txError } = await supabase.rpc('place_bulk_order_tx', {
      p_buyer_id: req.user.id,
      p_seller_id: supplierId,
      p_items: items, // Supabase client automatically serializes objects/arrays passed as JSONB parameter
      p_delivery_location: deliveryLocation || null,
      p_notes: notes || null
    });

    // Check if the RPC executed successfully and returned a custom error/success
    if (!txError && txResult) {
      if (txResult.success) {
        // Fetch and enrich the created order to return to the client
        const { data: order, error: fetchErr } = await supabase
          .from('orders')
          .select(`
            *,
            buyer:users!buyer_id(id, shop_name, email),
            seller:users!seller_id(id, shop_name, email)
          `)
          .eq('id', txResult.order_id)
          .single();

        if (fetchErr) throw fetchErr;

        const enriched = await enrichOrder(order);
        return res.status(201).json({ 
          message: 'Bulk order placed successfully', 
          order: enriched 
        });
      } else {
        return res.status(400).json({ message: txResult.message });
      }
    }

    // If RPC failed because function not found (PGRST501), fallback to Node.js manual logic
    if (txError && txError.code !== 'PGRST501' && txError.message && !txError.message.includes('place_bulk_order_tx')) {
      throw txError;
    }

    console.warn('⚠️ place_bulk_order_tx RPC not found or failed to load. Falling back to manual Node.js order processing...');

    // Fallback: Manual processing
    // 1. Verify connection
    const [u1, u2] = [req.user.id, supplierId].sort();
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

    // 2. Fetch all products and validate
    const productIds = items.map(item => item.productId);
    const { data: dbProducts, error: prodErr } = await supabase
      .from('wholesaler_products')
      .select('id, wholesaler_id, product_name, price_per_unit, stock_available, moq, unit, category')
      .in('id', productIds);

    if (prodErr) throw prodErr;

    const productsMap = {};
    if (dbProducts) {
      dbProducts.forEach(p => {
        productsMap[p.id] = p;
      });
    }

    // Perform validations before doing any writes
    let grandTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = productsMap[item.productId];
      if (!product) {
        return res.status(400).json({ message: `Product with ID ${item.productId} not found` });
      }
      if (product.wholesaler_id !== supplierId) {
        return res.status(400).json({ 
          message: `Product ${product.product_name} does not belong to the selected supplier` 
        });
      }
      
      const qty = parseInt(item.quantity) || 0;
      if (qty < product.moq) {
        return res.status(400).json({ 
          message: `Product ${product.product_name} requires a minimum order quantity (MOQ) of ${product.moq}` 
        });
      }
      if (qty > product.stock_available) {
        return res.status(400).json({ 
          message: `Product ${product.product_name} has insufficient stock. Available: ${product.stock_available}, Requested: ${qty}` 
        });
      }

      const unitPrice = parseFloat(product.price_per_unit || 0);
      const subtotal = unitPrice * qty;
      grandTotal += subtotal;

      validatedItems.push({
        product_id: product.id,
        quantity: qty,
        price: unitPrice,
        stock_available: product.stock_available
      });
    }

    // 3. Create the order
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        buyer_id: req.user.id,
        seller_id: supplierId,
        total_price: grandTotal,
        delivery_location: deliveryLocation || null,
        notes: notes || null,
        status: 'pending',
      })
      .select(`
        *,
        buyer:users!buyer_id(id, shop_name, email),
        seller:users!seller_id(id, shop_name, email)
      `)
      .single();

    if (oErr) throw oErr;

    // 4. Create the order items and update stock
    for (const item of validatedItems) {
      // Insert item
      const { error: oiErr } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        });
      if (oiErr) {
        console.error('Error inserting order item:', oiErr);
      }

      // Update stock
      const newStock = item.stock_available - item.quantity;
      const { error: stockErr } = await supabase
        .from('wholesaler_products')
        .update({ stock_available: newStock })
        .eq('id', item.product_id);
      if (stockErr) {
        console.error('Error updating stock:', stockErr);
      }
      try {
        const socketIO = getIO();
        if (socketIO) {
          socketIO.emit('stock:updated', { productId: item.product_id, newStock, userId: req.user.id });
        }
      } catch (e) { /* socket not ready */ }
    }

    const enriched = await enrichOrder(order);
    res.status(201).json({ message: 'Bulk order placed successfully', order: enriched });
  } catch (error) {
    next(error);
  }
};

// ── FIX #1 — Edit placed order items ──────────────────────────────────────────
const editOrderItems = async (req, res, next) => {
  try {
    const { items } = req.body;
    const orderId = req.params.id;

    const { data: existing } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, status, total_price')
      .eq('id', orderId)
      .single();
    if (!existing) return res.status(404).json({ message: 'Order not found' });

    const isBuyer = existing.buyer_id === req.user.id;
    const isSeller = existing.seller_id === req.user.id;
    if (!isBuyer && !isSeller) return res.status(403).json({ message: 'Not authorized' });
    if (existing.status !== 'pending') return res.status(400).json({ message: 'Can only edit pending orders' });

    if (items && Array.isArray(items)) {
      // Delete existing items and re-insert
      await supabase.from('order_items').delete().eq('order_id', orderId);

      let newTotal = 0;
      for (const item of items) {
        const qty = parseInt(item.quantity) || 1;
        const price = parseFloat(item.price || 0);
        newTotal += qty * price;

        await supabase.from('order_items').insert({
          order_id: orderId,
          product_id: item.productId || item.product_id,
          quantity: qty,
          price,
        });
      }

      await supabase.from('orders').update({ total_price: newTotal }).eq('id', orderId);
    }

    const { data: updated } = await supabase
      .from('orders')
      .select('*, buyer:users!buyer_id(id, shop_name, email), seller:users!seller_id(id, shop_name, email)')
      .eq('id', orderId)
      .single();

    const enriched = await enrichOrder(updated);
    res.json({ message: 'Order items updated', order: enriched });
  } catch (error) { next(error); }
};

// ── FIX #2 — Credit/BNPL checkout ─────────────────────────────────────────────
const creditCheckout = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const { data: account } = await supabase
      .from('credit_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .single();
    if (!account) return res.status(400).json({ message: 'No credit account found. Create one first.' });

    const { data: order } = await supabase
      .from('orders')
      .select('id, total_price, applied_discount')
      .eq('id', orderId)
      .eq('buyer_id', req.user.id)
      .eq('status', 'pending')
      .single();
    if (!order) return res.status(404).json({ message: 'Pending order not found' });

    const netPrice = parseFloat(order.total_price) - parseFloat(order.applied_discount || 0);
    const available = parseFloat(account.credit_limit) - parseFloat(account.balance_used);

    if (netPrice > available) {
      return res.status(400).json({
        message: `Insufficient credit. Need ₹${netPrice} but only ₹${available} available`,
      });
    }

    const newBalance = parseFloat(account.balance_used) + netPrice;
    await supabase.from('credit_accounts').update({ balance_used: newBalance }).eq('id', account.id);

    await supabase.from('orders').update({ status: 'accepted' }).eq('id', orderId);

    await supabase.from('credit_transactions').insert({
      credit_account_id: account.id,
      order_id: orderId,
      amount: netPrice,
      type: 'debit',
      note: `Credit purchase for order #${orderId.slice(0, 8)}`,
    });

    res.json({ message: 'Order paid via credit successfully', amountCharged: netPrice });
  } catch (error) { next(error); }
};

// ── FEATURE #55 — Download receipt as PDF ────────────────────────────────────
const downloadReceipt = async (req, res, next) => {
  try {
    const { generateReceiptStream } = require('../services/receipt.service');
    const doc = await generateReceiptStream(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Receipt not available' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${req.params.id.slice(0, 8)}.pdf`);
    doc.pipe(res);
  } catch (error) { next(error); }
};

// ── FEATURE #71 — Fraud check endpoint ───────────────────────────────────────
const checkFraudEndpoint = async (req, res, next) => {
  try {
    const { checkFraud } = require('../services/fraud.service');
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, total_price')
      .eq('id', req.params.id)
      .single();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', req.params.id);

    const flags = await checkFraud(order.id, order.buyer_id, order.seller_id, parseFloat(order.total_price), items || []);
    res.json({ fraudFlags: flags, flagged: flags.length > 0 });
  } catch (error) { next(error); }
};

module.exports = {
  createOrder,
  createOrderBulk,
  getBuyingOrders,
  getSellingOrders,
  getOrders,
  updateOrderStatus,
  editOrderItems,
  creditCheckout,
  downloadReceipt,
  checkFraudEndpoint,
};
