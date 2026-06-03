const { supabase } = require('../config/db');

const getCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('owner_id', req.user.id)
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .range((page - 1) * limit, (page - 1) * limit + parseInt(limit) - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ customers: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count } });
  } catch (error) { next(error); }
};

const getCustomer = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer: data });
  } catch (error) { next(error); }
};

const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const { data, error } = await supabase
      .from('customers')
      .insert({ owner_id: req.user.id, name, phone, email, address, notes })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ customer: data });
  } catch (error) { next(error); }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    const { data, error } = await supabase
      .from('customers')
      .update({ name, phone, email, address, notes })
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer: data });
  } catch (error) { next(error); }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Customer deleted' });
  } catch (error) { next(error); }
};

const getCustomerOrders = async (req, res, next) => {
  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('phone, name')
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .single();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', req.user.id)
      .or(`buyer_phone.eq.${customer.phone},buyer_name.eq.${customer.name}`)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: selling } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', req.user.id)
      .or(`buyer_phone.eq.${customer.phone},buyer_name.eq.${customer.name}`)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({ orders: [...(orders || []), ...(selling || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) });
  } catch (error) { next(error); }
};

// ── Loyalty (#50) ──
const getLoyaltyTransactions = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', req.params.customerId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ transactions: data || [] });
  } catch (error) { next(error); }
};

const awardLoyaltyPoints = async (req, res, next) => {
  try {
    const { points, order_ref, note } = req.body;
    if (!points) return res.status(400).json({ message: 'Points are required' });

    const { data: customer } = await supabase
      .from('customers')
      .select('id, loyalty_points, total_spend, visit_count')
      .eq('id', req.params.customerId)
      .eq('owner_id', req.user.id)
      .single();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await supabase.from('loyalty_transactions').insert({
      customer_id: customer.id, points, type: 'earn', order_ref, note,
    });

    const { data: updated } = await supabase
      .from('customers')
      .update({ loyalty_points: customer.loyalty_points + points })
      .eq('id', customer.id)
      .select()
      .single();

    res.json({ customer: updated });
  } catch (error) { next(error); }
};

const redeemLoyaltyPoints = async (req, res, next) => {
  try {
    const { points, note } = req.body;
    if (!points) return res.status(400).json({ message: 'Points are required' });

    const { data: customer } = await supabase
      .from('customers')
      .select('id, loyalty_points')
      .eq('id', req.params.customerId)
      .eq('owner_id', req.user.id)
      .single();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (customer.loyalty_points < points) {
      return res.status(400).json({ message: `Only ${customer.loyalty_points} points available` });
    }

    await supabase.from('loyalty_transactions').insert({
      customer_id: customer.id, points: -points, type: 'redeem', note,
    });

    const { data: updated } = await supabase
      .from('customers')
      .update({ loyalty_points: customer.loyalty_points - points })
      .eq('id', customer.id)
      .select()
      .single();

    res.json({ customer: updated });
  } catch (error) { next(error); }
};

module.exports = {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  getCustomerOrders, getLoyaltyTransactions, awardLoyaltyPoints, redeemLoyaltyPoints,
};
