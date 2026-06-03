const { supabase } = require('../config/db');

// ── FEATURE #60 — Profit margin per product ──────────────────────────────────
const getProfitMargins = async (req, res, next) => {
  try {
    const { data: products } = await supabase
      .from('wholesaler_products')
      .select('id, product_name, price_per_unit, unit, category')
      .eq('wholesaler_id', req.user.id);

    if (!products || products.length === 0) {
      return res.json({ margins: [] });
    }

    const productIds = products.map(p => p.id);

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, price')
      .in('product_id', productIds);

    const salesMap = {};
    (orderItems || []).forEach(item => {
      if (!salesMap[item.product_id]) {
        salesMap[item.product_id] = { qty: 0, revenue: 0 };
      }
      salesMap[item.product_id].qty += item.quantity || 0;
      salesMap[item.product_id].revenue += (item.quantity || 0) * parseFloat(item.price || 0);
    });

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('user_id', req.user.id);

    const totalExpenses = (expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    const totalRevenue = Object.values(salesMap).reduce((s, v) => s + v.revenue, 0);
    const overheadRate = totalRevenue > 0 ? totalExpenses / totalRevenue : 0;

    const margins = products.map(p => {
      const sales = salesMap[p.id] || { qty: 0, revenue: 0 };
      const unitPrice = parseFloat(p.price_per_unit || 0);
      const avgSalePrice = sales.qty > 0 ? sales.revenue / sales.qty : unitPrice;
      const allocatedOverhead = unitPrice * overheadRate;
      const costPrice = unitPrice * 0.7;
      const totalCost = costPrice + allocatedOverhead;
      const profitPerUnit = avgSalePrice - totalCost;
      const marginPercent = avgSalePrice > 0 ? (profitPerUnit / avgSalePrice) * 100 : 0;

      return {
        productId: p.id,
        productName: p.product_name,
        unit: p.unit,
        category: p.category,
        sellingPrice: unitPrice,
        estimatedCost: Math.round(costPrice * 100) / 100,
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
        unitsSold: sales.qty,
        totalRevenue: Math.round(sales.revenue * 100) / 100,
      };
    });

    margins.sort((a, b) => b.marginPercent - a.marginPercent);

    res.json({ margins });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #63 — Credit / BNPL ──────────────────────────────────────────────
const getCreditAccount = async (req, res, next) => {
  try {
    const { data: account } = await supabase
      .from('credit_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!account) {
      return res.json({ account: null, transactions: [] });
    }

    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('credit_account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const available = parseFloat(account.credit_limit) - parseFloat(account.balance_used);

    res.json({
      account: {
        ...account,
        available: Math.round(available * 100) / 100,
        creditLimit: parseFloat(account.credit_limit),
        balanceUsed: parseFloat(account.balance_used),
      },
      transactions: transactions || [],
    });
  } catch (error) {
    next(error);
  }
};

const createCreditAccount = async (req, res, next) => {
  try {
    const { credit_limit } = req.body;

    const { data: existing } = await supabase
      .from('credit_accounts')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'Credit account already exists' });
    }

    const { data, error } = await supabase
      .from('credit_accounts')
      .insert({
        user_id: req.user.id,
        credit_limit: parseFloat(credit_limit || 0),
        balance_used: 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ account: data });
  } catch (error) {
    next(error);
  }
};

const repayCredit = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const { data: account } = await supabase
      .from('credit_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!account) {
      return res.status(404).json({ message: 'Credit account not found' });
    }

    const repayAmount = Math.min(parseFloat(amount), parseFloat(account.balance_used));

    const { data: updated, error } = await supabase
      .from('credit_accounts')
      .update({ balance_used: parseFloat(account.balance_used) - repayAmount })
      .eq('id', account.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('credit_transactions').insert({
      credit_account_id: account.id,
      amount: repayAmount,
      type: 'credit',
      note: 'Repayment',
    });

    const available = parseFloat(updated.credit_limit) - parseFloat(updated.balance_used);

    res.json({
      account: { ...updated, available: Math.round(available * 100) / 100 },
      message: `₹${repayAmount} repaid successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// ── FEATURE #65 — Finance dashboard data ─────────────────────────────────────
const getFinanceDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    // Revenue from delivered/accepted orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id, created_at, total_price')
      .eq('seller_id', userId)
      .in('status', ['delivered', 'accepted'])
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: true });

    const totalRevenue = (orders || []).reduce((s, o) => s + parseFloat(o.total_price || 0), 0);

    // COGS from order_items (price paid to suppliers)
    const orderIds = (orders || []).map(o => o.id);
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, price')
      .in('order_id', orderIds);

    const totalCOGS = (items || []).reduce((s, i) => s + (i.quantity || 0) * parseFloat(i.price || 0), 0);

    // Expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category, date')
      .eq('user_id', userId)
      .gte('date', fromDate.split('T')[0])
      .lte('date', toDate.split('T')[0]);

    const totalExpenses = (expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    // Revenue vs Expenses by month (last 12 months)
    const monthlyMap = {};
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    for (let d = new Date(twelveMonthsAgo); d <= new Date(); d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { month: key, revenue: 0, expenses: 0 };
    }

    (orders || []).forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += parseFloat(o.total_price || 0);
      }
    });

    (expenses || []).forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].expenses += parseFloat(e.amount || 0);
      }
    });

    const monthlyData = Object.values(monthlyMap).map(m => ({
      month: m.month,
      revenue: Math.round(m.revenue * 100) / 100,
      expenses: Math.round(m.expenses * 100) / 100,
    }));

    // Expense breakdown by category
    const categoryBreakdown = {};
    (expenses || []).forEach(e => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + parseFloat(e.amount || 0);
    });
    const expenseBreakdown = Object.entries(categoryBreakdown).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
    }));

    res.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
      },
      monthlyData,
      expenseBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

// ── Export CSV ───────────────────────────────────────────────────────────────
const exportFinanceCSV = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    const { data: orders } = await supabase
      .from('orders')
      .select('id, created_at, total_price, status')
      .eq('seller_id', userId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false });

    const orderRows = (orders || []).map(o =>
      `${new Date(o.created_at).toISOString().split('T')[0]},${o.id},${o.status},${o.total_price}`
    ).join('\n');

    const csv = `Date,Order ID,Status,Revenue\n${orderRows}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=finance-export.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfitMargins,
  getCreditAccount,
  createCreditAccount,
  repayCredit,
  getFinanceDashboard,
  exportFinanceCSV,
};
