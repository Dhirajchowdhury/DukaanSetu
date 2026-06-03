const { supabase } = require('../config/db');

const getSubscriptions = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, customer:customers(id, name, phone)')
      .eq('owner_id', req.user.id)
      .order('next_delivery', { ascending: true });
    if (error) throw error;
    res.json({ subscriptions: data || [] });
  } catch (error) { next(error); }
};

const createSubscription = async (req, res, next) => {
  try {
    const { customer_id, product_name, quantity, unit, frequency, next_delivery } = req.body;
    if (!customer_id || !product_name || !frequency || !next_delivery) {
      return res.status(400).json({ message: 'customer_id, product_name, frequency, and next_delivery are required' });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        customer_id, owner_id: req.user.id, product_name,
        quantity: quantity || 1, unit, frequency, next_delivery,
      })
      .select('*, customer:customers(id, name, phone)')
      .single();
    if (error) throw error;
    res.status(201).json({ subscription: data });
  } catch (error) { next(error); }
};

const updateSubscription = async (req, res, next) => {
  try {
    const { product_name, quantity, unit, frequency, next_delivery, active } = req.body;
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ product_name, quantity, unit, frequency, next_delivery, active })
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .select('*, customer:customers(id, name, phone)')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Subscription not found' });
    res.json({ subscription: data });
  } catch (error) { next(error); }
};

const deleteSubscription = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Subscription deleted' });
  } catch (error) { next(error); }
};

const getDeliverySchedule = async (req, res, next) => {
  try {
    const { subscription_id, from, to } = req.query;
    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

    let query = supabase
      .from('deliveries')
      .select('*, subscription:subscriptions(id, customer_id, product_name, customer:customers(id, name))')
      .gte('scheduled_date', fromDate)
      .lte('scheduled_date', toDate);

    if (subscription_id) query = query.eq('subscription_id', subscription_id);

    const { data, error } = await query.order('scheduled_date', { ascending: true });
    if (error) throw error;
    res.json({ deliveries: data || [] });
  } catch (error) { next(error); }
};

const markDelivery = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!['delivered', 'skipped'].includes(status)) {
      return res.status(400).json({ message: 'Status must be delivered or skipped' });
    }

    const updates = { status, note };
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('deliveries')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ delivery: data });
  } catch (error) { next(error); }
};

const generateDeliverySchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .eq('owner_id', req.user.id)
      .single();
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    const interval = sub.frequency === 'daily' ? 1 : sub.frequency === 'weekly' ? 7 : 30;
    const startDate = new Date(sub.next_delivery);
    const deliveries = [];

    for (let i = 0; i < 10; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i * interval);
      deliveries.push({ subscription_id: sub.id, scheduled_date: d.toISOString().split('T')[0] });
    }

    const { data, error } = await supabase.from('deliveries').insert(deliveries).select();
    if (error) throw error;
    res.status(201).json({ deliveries: data });
  } catch (error) { next(error); }
};

module.exports = {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  getDeliverySchedule, markDelivery, generateDeliverySchedule,
};
