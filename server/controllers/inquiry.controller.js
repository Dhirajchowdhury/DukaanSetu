const { supabase } = require('../config/db');

/**
 * @desc  Send an inquiry about a wholesaler product
 * @route POST /api/inquiries
 * body: { productId, quantity, message }
 */
const createInquiry = async (req, res, next) => {
  try {
    const { productId, quantity, message } = req.body;

    if (!productId) return res.status(400).json({ message: 'productId is required' });

    // Fetch product to get seller_id
    const { data: product, error: pErr } = await supabase
      .from('wholesaler_products')
      .select('id, wholesaler_id, product_name')
      .eq('id', productId)
      .single();

    if (pErr || !product) return res.status(404).json({ message: 'Product not found' });
    if (product.wholesaler_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot send inquiry for your own product' });
    }

    const { data: inquiry, error } = await supabase
      .from('inquiries')
      .insert({
        buyer_id:   req.user.id,
        seller_id:  product.wholesaler_id,
        product_id: productId,
        quantity:   quantity || 1,
        message:    message  || null,
        status:     'pending',
      })
      .select(`
        *,
        product:wholesaler_products(product_name, price_per_unit, unit),
        seller:users!inquiries_seller_id_fkey(id, shop_name)
      `)
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Inquiry sent', inquiry });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get inquiries for current user (as buyer or seller)
 * @route GET /api/inquiries
 * @query role=buyer|seller|all
 */
const getInquiries = async (req, res, next) => {
  try {
    const { role = 'all' } = req.query;

    let query = supabase
      .from('inquiries')
      .select(`
        *,
        product:wholesaler_products(product_name, price_per_unit, unit),
        buyer:users!inquiries_buyer_id_fkey(id, shop_name),
        seller:users!inquiries_seller_id_fkey(id, shop_name)
      `)
      .order('created_at', { ascending: false });

    if (role === 'buyer')  query = query.eq('buyer_id',  req.user.id);
    else if (role === 'seller') query = query.eq('seller_id', req.user.id);
    else query = query.or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ inquiries: data || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update inquiry status (seller only)
 * @route PUT /api/inquiries/:id
 * body: { status }
 */
const updateInquiry = async (req, res, next) => {
  try {
    const { status } = req.body;
    const VALID = ['replied', 'closed'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID.join(', ')}` });
    }

    const { data: existing } = await supabase
      .from('inquiries')
      .select('id, seller_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ message: 'Inquiry not found' });
    if (existing.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the seller can update inquiry status' });
    }

    const { data, error } = await supabase
      .from('inquiries')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Inquiry updated', inquiry: data });
  } catch (error) {
    next(error);
  }
};

module.exports = { createInquiry, getInquiries, updateInquiry };
