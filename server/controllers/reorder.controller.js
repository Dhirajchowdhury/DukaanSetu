const { supabase } = require('../config/db');

// ── Reorder Rules CRUD ────────────────────────────────────────────────────────

/**
 * @desc  List all reorder rules for the current user
 * @route GET /api/reorder-rules
 */
const getRules = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('reorder_rules')
      .select(`
        *,
        product:wholesaler_products!product_id(id, product_name, unit, category, price_per_unit, stock_available),
        supplier:users!supplier_id(id, shop_name, role)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ rules: data || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Create or upsert a reorder rule
 * @route POST /api/reorder-rules
 * body: { productId, supplierId, triggerQty, reorderQty }
 */
const createRule = async (req, res, next) => {
  try {
    const { productId, supplierId, triggerQty, reorderQty } = req.body;

    if (!productId || !supplierId) {
      return res.status(400).json({ message: 'productId and supplierId are required' });
    }
    if (triggerQty == null || reorderQty == null) {
      return res.status(400).json({ message: 'triggerQty and reorderQty are required' });
    }

    // Verify the product belongs to the given supplier
    const { data: product, error: pErr } = await supabase
      .from('wholesaler_products')
      .select('id, wholesaler_id, product_name, moq')
      .eq('id', productId)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.wholesaler_id !== supplierId) {
      return res.status(400).json({ message: 'Product does not belong to the selected supplier' });
    }
    if (Number(reorderQty) < (product.moq || 1)) {
      return res.status(400).json({
        message: `Reorder quantity must be at least ${product.moq || 1} (MOQ for ${product.product_name})`,
      });
    }

    // Verify accepted connection with supplier
    const [u1, u2] = [req.user.id, supplierId].sort();
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!conn) {
      return res.status(403).json({ message: 'You must have an accepted connection with this supplier' });
    }

    // Upsert — one rule per user-product pair
    const { data: rule, error: rErr } = await supabase
      .from('reorder_rules')
      .upsert(
        {
          user_id:     req.user.id,
          product_id:  productId,
          supplier_id: supplierId,
          trigger_qty: Number(triggerQty),
          reorder_qty: Number(reorderQty),
          is_active:   true,
        },
        { onConflict: 'user_id,product_id' }
      )
      .select(`
        *,
        product:wholesaler_products!product_id(id, product_name, unit, category, price_per_unit, stock_available),
        supplier:users!supplier_id(id, shop_name, role)
      `)
      .single();

    if (rErr) throw rErr;
    res.status(201).json({ message: 'Reorder rule saved', rule });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update a reorder rule (toggle active, change quantities)
 * @route PUT /api/reorder-rules/:id
 * body: { isActive?, triggerQty?, reorderQty? }
 */
const updateRule = async (req, res, next) => {
  try {
    const { isActive, triggerQty, reorderQty } = req.body;

    // Verify ownership
    const { data: existing } = await supabase
      .from('reorder_rules')
      .select('id, user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ message: 'Rule not found' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const updates = {};
    if (isActive !== undefined) updates.is_active = Boolean(isActive);
    if (triggerQty !== undefined) updates.trigger_qty = Number(triggerQty);
    if (reorderQty !== undefined) updates.reorder_qty = Number(reorderQty);

    const { data: rule, error } = await supabase
      .from('reorder_rules')
      .update(updates)
      .eq('id', req.params.id)
      .select(`
        *,
        product:wholesaler_products!product_id(id, product_name, unit, category, price_per_unit, stock_available),
        supplier:users!supplier_id(id, shop_name, role)
      `)
      .single();

    if (error) throw error;
    res.json({ message: 'Rule updated', rule });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Delete a reorder rule
 * @route DELETE /api/reorder-rules/:id
 */
const deleteRule = async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('reorder_rules')
      .select('id, user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ message: 'Rule not found' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const { error } = await supabase.from('reorder_rules').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Draft Orders ──────────────────────────────────────────────────────────────

/**
 * @desc  List pending draft orders for the current user
 * @route GET /api/draft-orders
 */
const getDraftOrders = async (req, res, next) => {
  try {
    const { status = 'pending_approval' } = req.query;

    const { data, error } = await supabase
      .from('draft_orders')
      .select(`
        *,
        product:wholesaler_products!product_id(id, product_name, unit, category, price_per_unit, stock_available, moq),
        supplier:users!seller_id(id, shop_name, role),
        rule:reorder_rules!rule_id(id, trigger_qty, reorder_qty)
      `)
      .eq('buyer_id', req.user.id)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ drafts: data || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Approve or reject a draft order
 * @route PUT /api/draft-orders/:id
 * body: { action: 'approve' | 'reject' }
 */
const resolveDraftOrder = async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "approve" or "reject"' });
    }

    // Fetch draft with full details
    const { data: draft, error: dErr } = await supabase
      .from('draft_orders')
      .select(`
        *,
        product:wholesaler_products!product_id(id, product_name, stock_available, moq, price_per_unit),
        supplier:users!seller_id(id, shop_name)
      `)
      .eq('id', req.params.id)
      .eq('buyer_id', req.user.id)
      .maybeSingle();

    if (dErr) throw dErr;
    if (!draft) return res.status(404).json({ message: 'Draft order not found' });
    if (draft.status !== 'pending_approval') {
      return res.status(400).json({ message: `Draft is already ${draft.status}` });
    }

    if (action === 'reject') {
      const { error } = await supabase
        .from('draft_orders')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', draft.id);
      if (error) throw error;
      return res.json({ message: 'Draft order rejected' });
    }

    // APPROVE: validate stock, then create a real order via bulk flow
    const product = draft.product;
    if (!product) return res.status(400).json({ message: 'Associated product no longer exists' });

    if (draft.quantity < (product.moq || 1)) {
      return res.status(400).json({
        message: `Cannot approve: MOQ for ${product.product_name} is ${product.moq}`,
      });
    }
    if (draft.quantity > product.stock_available) {
      return res.status(400).json({
        message: `Cannot approve: Only ${product.stock_available} units of ${product.product_name} in stock`,
      });
    }

    // Create the real order
    const currentPrice = parseFloat(product.price_per_unit || 0);
    const total = currentPrice * draft.quantity;

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        buyer_id:  draft.buyer_id,
        seller_id: draft.seller_id,
        total_price: total,
        status: 'pending',
        notes: `Auto-reorder (draft approved)`,
      })
      .select('id')
      .single();

    if (oErr) throw oErr;

    // Insert order item
    await supabase.from('order_items').insert({
      order_id:   order.id,
      product_id: draft.product_id,
      quantity:   draft.quantity,
      price:      currentPrice,
    });

    // Deduct stock
    await supabase
      .from('wholesaler_products')
      .update({ stock_available: product.stock_available - draft.quantity })
      .eq('id', draft.product_id);

    // Mark draft as approved
    await supabase
      .from('draft_orders')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', draft.id);

    res.json({ message: 'Draft approved — order placed', orderId: order.id });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRules, createRule, updateRule, deleteRule, getDraftOrders, resolveDraftOrder };
