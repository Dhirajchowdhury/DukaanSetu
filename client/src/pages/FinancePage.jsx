import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiPieChart, FiDownload, FiCalendar } from 'react-icons/fi';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/* ── Shared styles ──────────────────────────────────────────────────────────── */

// FIX 2 — segmented period selector
const segWrap  = { display: 'flex', background: '#f3f4f6', borderRadius: '10px', padding: '4px', width: 'fit-content', gap: 0 };
const segBtn   = (active) => ({
  padding: '6px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: active ? 500 : 400,
  border: 'none',
  cursor: 'pointer',
  background: active ? '#fff' : 'transparent',
  color:      active ? '#111827' : '#6b7280',
  boxShadow:  active ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
  transition: 'all .15s',
});

// FIX 3 — chart container
const chartBox = { minHeight: '280px', padding: '1rem', position: 'relative' };

// FIX 1 — stat card with left accent bar
const statCard = (accentColor) => ({
  background: '#fff',
  borderRadius: '14px',
  border: '1px solid #e5e7eb',
  padding: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  position: 'relative',
  overflow: 'hidden',
});
const accentBar = (color) => ({
  position: 'absolute',
  left: 0, top: 0, bottom: 0,
  width: '3px',
  background: color,
  borderRadius: '3px 0 0 3px',
});

// Reusable "no data" placeholder for charts
const NoData = ({ message = 'No data yet', sub = '' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: '#9ca3af' }}>
    <FiPieChart size={32} style={{ marginBottom: '8px', opacity: .45 }} />
    <p style={{ fontSize: '13px', margin: 0 }}>{message}</p>
    {sub && <p style={{ fontSize: '12px', marginTop: '4px', opacity: .7 }}>{sub}</p>}
  </div>
);

const FinancePage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [margins,   setMargins]   = useState([]);
  const [credit,    setCredit]    = useState(null);
  const [creditTxns, setCreditTxns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [creditLoading, setCreditLoading] = useState(true);
  const [dateRange, setDateRange] = useState('12m');
  const [repayAmount,  setRepayAmount]  = useState('');
  const [createLimit,  setCreateLimit]  = useState('');

  useEffect(() => {
    fetchDashboard();
    fetchMargins();
    fetchCredit();
  }, [dateRange]);

  const getDateParams = () => {
    const now = new Date();
    if (dateRange === '1m') {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      return { from, to: now.toISOString().split('T')[0] };
    }
    if (dateRange === '3m') {
      const from = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
      return { from, to: now.toISOString().split('T')[0] };
    }
    return {};
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = getDateParams();
      const { data } = await api.get('/finance/dashboard', { params });
      setDashboard(data);
    } catch {} finally { setLoading(false); }
  };

  const fetchMargins = async () => {
    try {
      const { data } = await api.get('/finance/margins');
      setMargins(data.margins || []);
    } catch {}
  };

  const fetchCredit = async () => {
    setCreditLoading(true);
    try {
      const { data } = await api.get('/finance/credit');
      setCredit(data.account);
      setCreditTxns(data.transactions || []);
    } catch {} finally { setCreditLoading(false); }
  };

  const handleRepay = async () => {
    if (!repayAmount || repayAmount <= 0) return;
    try {
      const { data } = await api.post('/finance/credit/repay', { amount: parseFloat(repayAmount) });
      setCredit(data.account);
      setRepayAmount('');
      fetchCredit();
    } catch {}
  };

  const handleCreateCredit = async () => {
    if (!createLimit || createLimit <= 0) return;
    try {
      await api.post('/finance/credit', { credit_limit: parseFloat(createLimit) });
      setCreateLimit('');
      fetchCredit();
    } catch {}
  };

  const handleExport = async () => {
    try {
      const params = getDateParams();
      const { data } = await api.get('/finance/export', { params, responseType: 'blob' });
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finance-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { borderDash: [5, 5] } } },
  };
  const barChartOptions = {
    ...chartOptions,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
  };

  const marginData = {
    labels: margins.map(m => m.productName),
    datasets: [{
      label: 'Profit Margin %',
      data: margins.map(m => m.marginPercent),
      backgroundColor: margins.map(m => m.marginPercent >= 0 ? '#10b981' : '#ef4444'),
      borderRadius: 4,
    }],
  };

  const monthlyData = dashboard ? {
    labels: dashboard.monthlyData.map(m => m.month),
    datasets: [
      { label: 'Revenue',  data: dashboard.monthlyData.map(m => m.revenue),  backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Expenses', data: dashboard.monthlyData.map(m => m.expenses), backgroundColor: '#ef4444', borderRadius: 4 },
    ],
  } : { labels: [], datasets: [] };

  const expensePieData = dashboard ? {
    labels: dashboard.expenseBreakdown.map(e => e.category),
    datasets: [{
      data: dashboard.expenseBreakdown.map(e => e.amount),
      backgroundColor: ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899'],
      borderWidth: 1,
    }],
  } : { labels: [], datasets: [] };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>

          {/* ── FIX 2 + FIX 6: Page header row ── */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#111827', margin: 0 }}>Finance Dashboard</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Revenue, profit, margins, and credit management</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
            {/* FIX 2 — segmented period selector */}
            <div style={segWrap}>
              {[{ value: '1m', label: '1M' }, { value: '3m', label: '3M' }, { value: '12m', label: '12M' }].map(r => (
                <button key={r.value} onClick={() => setDateRange(r.value)} style={segBtn(dateRange === r.value)}>
                  {r.label}
                </button>
              ))}
            </div>

            {/* FIX 6 — Export CSV outlined button */}
            <button
              onClick={handleExport}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 16px',
                background: 'transparent',
                border: '0.5px solid #d1d5db',
                borderRadius: '9px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <FiDownload size={14} /> Export CSV
            </button>
          </div>

          {/* ── Summary Cards ── */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: '88px', background: '#f3f4f6', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : dashboard ? (
            <>
              {/* FIX 1 — stat cards: uniform value color, left accent bar, no colored text on numbers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                  { icon: <FiTrendingUp size={18} color="#2563eb" />, label: 'Total Revenue',            value: fmt(dashboard.summary.totalRevenue),  accent: '#2563eb' },
                  { icon: <FiTrendingDown size={18} color="#f59e0b" />, label: 'Total COGS',             value: fmt(dashboard.summary.totalCOGS),     accent: '#f59e0b' },
                  { icon: <FiDollarSign size={18} color="#10b981" />, label: 'Gross Profit',             value: fmt(dashboard.summary.grossProfit),   accent: '#10b981' },
                  {
                    icon: <FiDollarSign size={18} color={dashboard.summary.netProfit >= 0 ? '#10b981' : '#ef4444'} />,
                    label: 'Net Profit (after expenses)',
                    value: fmt(dashboard.summary.netProfit),
                    accent: dashboard.summary.netProfit >= 0 ? '#10b981' : '#ef4444',
                  },
                ].map((card, i) => (
                  <div key={i} style={statCard(card.accent)}>
                    <div style={accentBar(card.accent)} />
                    <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {/* FIX 1 — plain flat icon, no decorative pill border */}
                      <span style={{ flexShrink: 0 }}>{card.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: 600 }}>
                          {card.label}
                        </p>
                        {/* FIX 1 — value always text-primary (#111827), never colored */}
                        <p style={{ fontSize: '26px', fontWeight: 500, color: '#111827', margin: '4px 0 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {card.value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Charts Row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '20px', marginBottom: '20px' }}>

                {/* Revenue vs Expenses */}
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', ...chartBox, display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#374151', margin: '0 0 8px' }}>Revenue vs Expenses (Monthly)</p>
                  {/* FIX 3 — chart wrapper with min-height so canvas never collapses */}
                  <div style={{ flex: 1, minHeight: '240px', position: 'relative' }}>
                    {dashboard.monthlyData.length > 0
                      ? <Bar data={monthlyData} options={chartOptions} />
                      : <NoData />
                    }
                  </div>
                </div>

                {/* FIX 4 — Expense Breakdown empty state */}
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', ...chartBox, display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#374151', margin: '0 0 8px' }}>Expense Breakdown</p>
                  <div style={{ flex: 1, minHeight: '240px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {dashboard.expenseBreakdown.length > 0 ? (
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <Pie data={expensePieData} options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } },
                        }} />
                      </div>
                    ) : (
                      /* FIX 4 — proper empty state instead of floating plain text */
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', textAlign: 'center' }}>
                        <FiTrendingDown size={32} style={{ marginBottom: '8px', opacity: .4 }} />
                        <p style={{ fontSize: '14px', margin: 0 }}>No expenses recorded yet</p>
                        <p style={{ fontSize: '12px', marginTop: '4px', opacity: .7 }}>Add expenses to see the breakdown</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* FIX 5 — Profit Margin per Product */}
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '24px' }}>
                {/* FIX 5 — proper section header */}
                <p style={{ fontSize: '16px', fontWeight: 500, color: '#111827', margin: '0 0 12px' }}>Profit Margin per Product</p>
                {/* FIX 5 — min-height 240px so it never collapses */}
                <div style={{ minHeight: '240px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {margins.length > 0 ? (
                    <div style={{ width: '100%', height: '240px', position: 'relative' }}>
                      <Bar data={marginData} options={{
                        ...barChartOptions,
                        scales: {
                          ...barChartOptions.scales,
                          x: { beginAtZero: true, grid: { borderDash: [5, 5] } },
                          y: { grid: { display: false } },
                        },
                      }} />
                    </div>
                  ) : (
                    /* FIX 5 — proper empty state */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', textAlign: 'center', padding: '32px' }}>
                      <FiPieChart size={32} style={{ marginBottom: '8px', opacity: .4 }} />
                      <p style={{ fontSize: '14px', margin: 0 }}>No margin data yet</p>
                      <p style={{ fontSize: '12px', marginTop: '4px', opacity: .7 }}>Add orders and expenses to see margins</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#9ca3af', textAlign: 'center' }}>
              <FiDollarSign size={40} style={{ marginBottom: '12px', opacity: .35 }} />
              <p style={{ fontSize: '15px', margin: 0 }}>No finance data available</p>
              <p style={{ fontSize: '13px', marginTop: '6px', opacity: .7 }}>Add orders and expenses to see insights.</p>
            </div>
          )}

          {/* ── Credit / BNPL Section — unchanged logic, same markup ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Credit / BNPL</h2>
              {!credit && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Credit limit"
                    value={createLimit}
                    onChange={e => setCreateLimit(e.target.value)}
                    className="form-input"
                    style={{ width: 140, padding: '6px 10px', fontSize: 13 }}
                  />
                  <button onClick={handleCreateCredit} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">
                    Create Account
                  </button>
                </div>
              )}
            </div>
            {creditLoading ? (
              <div className="p-6 animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
              </div>
            ) : credit ? (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{fmt(credit.creditLimit)}</p>
                    <p className="text-xs text-green-600 font-semibold">Credit Limit</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{fmt(credit.balanceUsed)}</p>
                    <p className="text-xs text-amber-600 font-semibold">Used</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{fmt(credit.available)}</p>
                    <p className="text-xs text-blue-600 font-semibold">Available</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <input
                    type="number"
                    placeholder="Repay amount"
                    value={repayAmount}
                    onChange={e => setRepayAmount(e.target.value)}
                    className="form-input"
                    style={{ width: 180, padding: '8px 12px', fontSize: 13 }}
                  />
                  <button
                    onClick={handleRepay}
                    disabled={!repayAmount || repayAmount <= 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Repay
                  </button>
                </div>
                <h4 className="font-semibold text-sm text-gray-700 mb-3">Transaction History</h4>
                {creditTxns.length === 0 ? (
                  <p className="text-sm text-gray-400">No transactions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Type</th>
                          <th className="px-4 py-3 font-semibold text-right">Amount</th>
                          <th className="px-4 py-3 font-semibold">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {creditTxns.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.type === 'debit' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{fmt(t.amount)}</td>
                            <td className="px-4 py-3 text-gray-500">{t.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-400">No credit account yet. Create one to use BNPL.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default FinancePage;
