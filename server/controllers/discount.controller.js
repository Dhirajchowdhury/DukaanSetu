const { supabase } = require('../config/db');

const getDiscountRules = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('discount_rules')
      .select('*')
      .eq('owner_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ rules: data || [] });
  } catch (error) { next(error); }
};

const createDiscountRule = async (req, res, next) => {
  try {
    const { name, type, condition_json, discount_pct } = req.body;
    if (!name || !type || !condition_json || !discount_pct) {
      return res.status(400).json({ message: 'name, type, condition_json, and discount_pct are required' });
    }
    if (discount_pct <= 0 || discount_pct > 100) {
      return res.status(400).json({ message: 'discount_pct must be between 1 and 100' });
    }
    if (!['bulk', 'expiry', 'festival', 'manual'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type' });
    }

    const { data, error } = await supabase
      .from('discount_rules')
      .insert({ owner_id: req.user.id, name, type, condition_json, discount_pct })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ rule: data });
  } catch (error) { next(error); }
};

const updateDiscountRule = async (req, res, next) => {
  try {
    const { name, type, condition_json, discount_pct, active } = req.body;
    const { data, error } = await supabase
      .from('discount_rules')
      .update({ name, type, condition_json, discount_pct, active })
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Discount rule not found' });
    res.json({ rule: data });
  } catch (error) { next(error); }
};

const deleteDiscountRule = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('discount_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Discount rule deleted' });
  } catch (error) { next(error); }
};

const applyDiscount = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { ruleId } = req.body;

    const { data: rule } = await supabase
      .from('discount_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('owner_id', req.user.id)
      .eq('active', true)
      .single();
    if (!rule) return res.status(404).json({ message: 'Active discount rule not found' });

    const { data: order } = await supabase
      .from('orders')
      .select('total_price, applied_discount')
      .eq('id', orderId)
      .single();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const discountAmount = parseFloat(order.total_price) * (rule.discount_pct / 100);
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ applied_discount: discountAmount })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;

    res.json({ order: updated, discountApplied: discountAmount });
  } catch (error) { next(error); }
};

module.exports = {
  getDiscountRules, createDiscountRule, updateDiscountRule, deleteDiscountRule, applyDiscount,
};
