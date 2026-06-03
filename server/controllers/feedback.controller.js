const { supabase } = require('../config/db');

const getFeedback = async (req, res, next) => {
  try {
    const { rating, page = 1, limit = 20 } = req.query;
    let query = supabase
      .from('customer_feedback')
      .select('*, customer:customers(id, name, phone)', { count: 'exact' })
      .eq('owner_id', req.user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, (page - 1) * limit + parseInt(limit) - 1);

    if (rating) query = query.eq('rating', parseInt(rating));

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ feedback: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count } });
  } catch (error) { next(error); }
};

const createFeedback = async (req, res, next) => {
  try {
    const { customer_id, rating, comment } = req.body;
    if (!customer_id || !rating) return res.status(400).json({ message: 'customer_id and rating are required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .eq('owner_id', req.user.id)
      .single();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { data, error } = await supabase
      .from('customer_feedback')
      .insert({ customer_id, owner_id: req.user.id, rating, comment })
      .select('*, customer:customers(id, name, phone)')
      .single();
    if (error) throw error;
    res.status(201).json({ feedback: data });
  } catch (error) { next(error); }
};

const deleteFeedback = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('customer_feedback')
      .delete()
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Feedback deleted' });
  } catch (error) { next(error); }
};

const getFeedbackStats = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('customer_feedback')
      .select('rating')
      .eq('owner_id', req.user.id);

    const ratings = data || [];
    const total = ratings.length;
    const avgRating = total > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / total : 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

    res.json({ stats: { total, avgRating: Math.round(avgRating * 10) / 10, distribution } });
  } catch (error) { next(error); }
};

module.exports = { getFeedback, createFeedback, deleteFeedback, getFeedbackStats };
