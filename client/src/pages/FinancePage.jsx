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

const FinancePage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [margins, setMargins] = useState([]);
  const [credit, setCredit] = useState(null);
  const [creditTxns, setCreditTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditLoading, setCreditLoading] = useState(true);
  const [dateRange, setDateRange] = useState('12m');
  const [repayAmount, setRepayAmount] = useState('');
  const [createLimit, setCreateLimit] = useState('');

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
      { label: 'Revenue', data: dashboard.monthlyData.map(m => m.revenue), backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Expenses', data: dashboard.monthlyData.map(m => m.expenses), backgroundColor: '#ef4444', borderRadius: 4 },
    ],
  } : { labels: [], datasets: [] };

  const expensePieData = dashboard ? {
    labels: dashboard.expenseBreakdown.map(e => e.category),
    datasets: [{
      data: dashboard.expenseBreakdown.map(e => e.amount),
      backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'],
      borderWidth: 1,
    }],
  } : { labels: [], datasets: [] };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
              <p className="text-sm text-gray-500">Revenue, profit, margins, and credit management</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                {[
                  { value: '1m', label: '1M' },
                  { value: '3m', label: '3M' },
                  { value: '12m', label: '12M' },
                ].map(r => (
                  <button
                    key={r.value}
                    onClick={() => setDateRange(r.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateRange === r.value ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                  >{r.label}</button>
                ))}
              </div>
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50">
                <FiDownload /> Export CSV
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {loading ? (
            <div className="animate-pulse grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
            </div>
          ) : dashboard ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-5 text-center">
                  <FiTrendingUp className="mx-auto text-green-500 mb-1" size={20} />
                  <p className="text-2xl font-bold text-gray-900">{fmt(dashboard.summary.totalRevenue)}</p>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                </div>
                <div className="bg-white rounded-xl border p-5 text-center">
                  <FiTrendingDown className="mx-auto text-red-500 mb-1" size={20} />
                  <p className="text-2xl font-bold text-gray-900">{fmt(dashboard.summary.totalCOGS)}</p>
                  <p className="text-xs text-gray-500">Total COGS</p>
                </div>
                <div className="bg-white rounded-xl border p-5 text-center">
                  <FiDollarSign className="mx-auto text-indigo-500 mb-1" size={20} />
                  <p className="text-2xl font-bold text-indigo-600">{fmt(dashboard.summary.grossProfit)}</p>
                  <p className="text-xs text-gray-500">Gross Profit</p>
                </div>
                <div className="bg-white rounded-xl border p-5 text-center">
                  <FiDollarSign className="mx-auto text-amber-500 mb-1" size={20} />
                  <p className="text-2xl font-bold text-amber-600">{fmt(dashboard.summary.netProfit)}</p>
                  <p className="text-xs text-gray-500">Net Profit (after expenses)</p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 h-[350px]">
                  <h3 className="text-sm font-semibold mb-3">Revenue vs Expenses (Monthly)</h3>
                  <div className="h-[280px]">
                    <Bar data={monthlyData} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 h-[350px]">
                  <h3 className="text-sm font-semibold mb-3">Expense Breakdown</h3>
                  <div className="h-[280px] flex items-center justify-center">
                    {dashboard.expenseBreakdown.length > 0 ? (
                      <div className="w-full h-full relative">
                        <Pie data={expensePieData} options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } },
                        }} />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No expenses recorded</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 h-[400px] mb-6">
                <h3 className="text-sm font-semibold mb-3">Profit Margin per Product</h3>
                <div className="h-[330px]">
                  {margins.length > 0 ? (
                    <Bar data={marginData} options={{
                      ...barChartOptions,
                      scales: {
                        ...barChartOptions.scales,
                        x: { ...barChartOptions.scales.x, beginAtZero: true, grid: { borderDash: [5, 5] } },
                        y: { grid: { display: false } },
                      },
                    }} />
                  ) : (
                    <p className="text-sm text-gray-400 text-center pt-20">No margin data yet. Add orders and expenses.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-12">No finance data available. Add orders and expenses to see insights.</p>
          )}

          {/* Credit / BNPL Section */}
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
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
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
