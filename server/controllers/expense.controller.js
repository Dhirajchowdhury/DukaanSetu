const { supabase } = require('../config/db');

const createExpense = async (req, res, next) => {
  try {
    const { amount, category, description, date } = req.body;
    if (!amount || !category) {
      return res.status(400).json({ message: 'Amount and category are required' });
    }
    const validCategories = ['rent', 'salary', 'utilities', 'transport', 'misc'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: `Category must be one of: ${validCategories.join(', ')}` });
    }
    const { data, error } = await supabase.from('expenses').insert({
      user_id: req.user.id,
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
    }).select().single();

    if (error) throw error;
    res.status(201).json({ expense: data });
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const { category, from, to, page = 1, limit = 20 } = req.query;
    const fromIdx = (parseInt(page) - 1) * parseInt(limit);
    const toIdx = fromIdx + parseInt(limit) - 1;

    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('date', { ascending: false })
      .range(fromIdx, toIdx);

    if (category) query = query.eq('category', category);
    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data, error, count } = await query;
    if (error) throw error;

    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('user_id', req.user.id);

    const categoryTotals = {};
    (allExpenses || []).forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + parseFloat(e.amount || 0);
    });

    res.json({
      expenses: data || [],
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
      categoryTotals,
    });
  } catch (error) {
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const { amount, category, description, date } = req.body;
    const { data: existing } = await supabase
      .from('expenses').select('id, user_id').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ message: 'Expense not found' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    const updates = {};
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;

    const { data, error } = await supabase.from('expenses').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ expense: data });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('expenses').select('id, user_id').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ message: 'Expense not found' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    await supabase.from('expenses').delete().eq('id', req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createExpense, getExpenses, updateExpense, deleteExpense };
