import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPackage, FiAlertTriangle, FiClock, FiTrendingUp, FiTag, FiChevronDown, FiBarChart2, FiDollarSign, FiUsers, FiDownload } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import { useProducts } from '../context/ProductContext';
import api from '../services/api';
import { Bar, Line } from 'react-chartjs-2';
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
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const TABS = [
  { id: 'inventory', label: 'Inventory', icon: <FiPackage /> },
  { id: 'sales', label: 'Sales', icon: <FiTrendingUp /> },
  { id: 'turnover', label: 'Turnover', icon: <FiBarChart2 /> },
  { id: 'profit-loss', label: 'Profit/Loss', icon: <FiDollarSign /> },
  { id: 'retention', label: 'Retention', icon: <FiUsers /> },
  { id: 'waste', label: 'Waste Alert', icon: <FiAlertTriangle /> },
];

const Reports = () => {
  const { stats, fetchStats, products, fetchProducts } = useProducts();
  const [searchParams] = useSearchParams();
  const [slowMovers, setSlowMovers] = useState([]);
  const [loadingSlow, setLoadingSlow] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');

  // Sales report
  const [salesPeriod, setSalesPeriod] = useState('daily');
  const [salesData, setSalesData] = useState(null);
  const [loadingSales, setLoadingSales] = useState(false);

  // Turnover
  const [turnoverData, setTurnoverData] = useState([]);
  const [loadingTurnover, setLoadingTurnover] = useState(false);
  const [turnoverSort, setTurnoverSort] = useState('turnoverRate');
  const [turnoverDir, setTurnoverDir] = useState('asc');

  // Profit/Loss
  const [profitLoss, setProfitLoss] = useState([]);
  const [loadingPL, setLoadingPL] = useState(false);

  // Retention
  const [retention, setRetention] = useState(null);
  const [loadingRet, setLoadingRet] = useState(false);

  // Waste Reduction
  const [wasteData, setWasteData] = useState([]);
  const [loadingWaste, setLoadingWaste] = useState(false);

  const filter = searchParams.get('filter') || 'all';

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 1000 });
    fetchSlowMovers();
  }, []);

  useEffect(() => {
    if (activeTab === 'sales') fetchSalesReport();
    if (activeTab === 'turnover') fetchTurnover();
    if (activeTab === 'profit-loss') fetchProfitLoss();
    if (activeTab === 'retention') fetchRetention();
    if (activeTab === 'waste') fetchWaste();
  }, [activeTab, salesPeriod]);

  const fetchSlowMovers = async () => {
    setLoadingSlow(true);
    try {
      const { data } = await api.get('/product-ranking');
      setSlowMovers(data.leastSold || []);
    } catch {} finally { setLoadingSlow(false); }
  };

  const fetchSalesReport = async () => {
    setLoadingSales(true);
    try {
      const { data } = await api.get('/reports/sales', { params: { period: salesPeriod } });
      setSalesData(data);
    } catch {} finally { setLoadingSales(false); }
  };

  const fetchTurnover = async () => {
    setLoadingTurnover(true);
    try {
      const { data } = await api.get('/analytics/turnover', { params: { days: 30 } });
      setTurnoverData(data.turnover || []);
    } catch {} finally { setLoadingTurnover(false); }
  };

  const fetchProfitLoss = async () => {
    setLoadingPL(true);
    try {
      const { data } = await api.get('/analytics/profit-loss');
      setProfitLoss(data.profitLoss || []);
    } catch {} finally { setLoadingPL(false); }
  };

  const fetchRetention = async () => {
    setLoadingRet(true);
    try {
      const { data } = await api.get('/analytics/retention');
      setRetention(data);
    } catch {} finally { setLoadingRet(false); }
  };

  const fetchWaste = async () => {
    setLoadingWaste(true);
    try {
      const { data } = await api.get('/ai/waste-reduction');
      setWasteData(data.suggestions || []);
    } catch {} finally { setLoadingWaste(false); }
  };

  const handleSort = (col) => {
    if (turnoverSort === col) {
      setTurnoverDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setTurnoverSort(col);
      setTurnoverDir('asc');
    }
  };

  const sortedTurnover = [...turnoverData].sort((a, b) => {
    const mul = turnoverDir === 'asc' ? 1 : -1;
    return mul * (a[turnoverSort] > b[turnoverSort] ? 1 : -1);
  });

  const downloadCSV = () => {
    if (!salesData?.periodResults) return;
    const headers = 'Period,Orders,Revenue,Avg Order Value,Buyers\n';
    const rows = salesData.periodResults.map(p => `${p.period},${p.totalOrders},${p.totalRevenue},${p.avgOrderValue},${p.uniqueBuyers}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `sales-report-${salesPeriod}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSendNudge = async (buyerId, shopName) => {
    try {
      await api.post('/dues/send-reminder', { buyerId });
    } catch {}
  };

  const lowStockItems = products.filter(p => p.isLowStock && p.quantity > 0);
  const outOfStock   = products.filter(p => p.quantity === 0);
  const expiringSoon = products.filter(p => p.isExpiringSoon);

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { borderDash: [5, 5] } } },
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Insights into your business performance.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >{tab.icon} {tab.label}</button>
          ))}
        </div>

        {/* ────── INVENTORY TAB ────── */}
        {activeTab === 'inventory' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { icon: <FiPackage />, label: 'Total Products', value: stats?.totalItems ?? '—', color: 'text-indigo-600' },
                { icon: <FiTrendingUp />, label: 'Inventory Value', value: stats ? fmt(stats.totalValue || 0) : '—', color: 'text-green-600' },
                { icon: <FiAlertTriangle />, label: 'Low Stock', value: stats?.lowStockCount ?? '—', color: 'text-amber-600' },
                { icon: <FiClock />, label: 'Expiring Soon', value: stats?.expiringSoonCount ?? '—', color: 'text-red-600' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border p-4 flex flex-col justify-center items-center text-center">
                  <div className={`text-2xl mb-2 ${s.color}`}>{s.icon}</div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="reports-grid">
              {filter === 'all' && (
                <div className="card reports-section">
                  <h3 className="reports-section__title"><FiTag /> Category Breakdown</h3>
                  {stats?.categoryStats?.length ? (
                    <div className="cat-breakdown">
                      {stats.categoryStats.map((c, i) => (
                        <div key={i} className="cat-breakdown__row">
                          <span className="cat-breakdown__name">{c.icon} {c.name}</span>
                          <div className="cat-breakdown__bar-wrap">
                            <div className="cat-breakdown__bar" style={{ width: `${Math.min(100, (c.count / (stats.totalItems || 1)) * 100)}%` }} />
                          </div>
                          <span className="cat-breakdown__count">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted" style={{ fontSize: 14 }}>No data yet.</p>}
                </div>
              )}
              {(filter === 'all' || filter === 'low') && (
                <div className="card reports-section" style={{ gridColumn: filter === 'low' ? 'span 2' : 'auto' }}>
                  <h3 className="reports-section__title"><FiAlertTriangle style={{ color: 'var(--warning)' }} /> Low Stock Items</h3>
                  {lowStockItems.length === 0 ? <p className="text-muted" style={{ fontSize: 14 }}>All items are well stocked 🎉</p> : (
                    <div className="report-list">{(filter === 'low' ? lowStockItems : lowStockItems.slice(0, 10)).map(p => (
                      <div key={p.id} className="report-list__row"><span className="report-list__name">{p.productName}</span><span className="badge badge-warning">{p.quantity} {p.unit}</span></div>
                    ))}</div>
                  )}
                </div>
              )}
              {(filter === 'all' || filter === 'out') && (
                <div className="card reports-section" style={{ gridColumn: filter === 'out' ? 'span 2' : 'auto' }}>
                  <h3 className="reports-section__title"><FiPackage style={{ color: 'var(--danger)' }} /> Out of Stock</h3>
                  {outOfStock.length === 0 ? <p className="text-muted" style={{ fontSize: 14 }}>No items out of stock 🎉</p> : (
                    <div className="report-list">{(filter === 'out' ? outOfStock : outOfStock.slice(0, 10)).map(p => (
                      <div key={p.id} className="report-list__row"><span className="report-list__name">{p.productName}</span><span className="badge badge-danger">Out of Stock</span></div>
                    ))}</div>
                  )}
                </div>
              )}
              {filter === 'all' && (
                <div className="card reports-section" style={{ gridColumn: 'span 2' }}>
                  <h3 className="reports-section__title"><FiChevronDown style={{ color: 'var(--warning)' }} /> Slow Movers</h3>
                  {loadingSlow ? <p className="text-muted">Loading...</p> : slowMovers.length === 0 ? <p className="text-muted">No slow-moving products 🎉</p> : (
                    <div className="report-list">
                      {slowMovers.slice(0, 20).map(p => (
                        <div key={p.productId} className="report-list__row">
                          <span className="report-list__name">{p.productName}</span>
                          <span className="badge badge-warning">{p.stockAvailable} in stock</span>
                          {p.stockAvailable > 10 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Stuck Inventory</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {(filter === 'all' || filter === 'expiring') && (
                <div className="card reports-section" style={{ gridColumn: filter === 'expiring' ? 'span 2' : 'auto' }}>
                  <h3 className="reports-section__title"><FiClock style={{ color: 'var(--danger)' }} /> Expiring Soon</h3>
                  {expiringSoon.length === 0 ? <p className="text-muted">No items expiring within 7 days 🎉</p> : (
                    <div className="report-list">{(filter === 'expiring' ? expiringSoon : expiringSoon.slice(0, 10)).map(p => (
                      <div key={p.id} className="report-list__row"><span className="report-list__name">{p.productName}</span><span className="badge badge-danger">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : ''}</span></div>
                    ))}</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ────── SALES TAB ────── */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                {['daily', 'weekly', 'monthly'].map(p => (
                  <button key={p} onClick={() => setSalesPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${salesPeriod === p ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                  >{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                ))}
              </div>
              {salesData?.periodResults?.length > 0 && (
                <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50">
                  <FiDownload /> CSV
                </button>
              )}
            </div>

            {loadingSales ? <p className="text-gray-400">Loading...</p> : salesData?.periodResults?.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{salesData.periodResults.reduce((s, p) => s + p.totalOrders, 0)}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{fmt(salesData.periodResults.reduce((s, p) => s + p.totalRevenue, 0))}</p>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                  </div>
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{fmt(salesData.periodResults.reduce((s, p) => s + p.avgOrderValue, 0) / Math.max(salesData.periodResults.length, 1))}</p>
                    <p className="text-xs text-gray-500">Avg Order Value</p>
                  </div>
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{salesData.periodResults.reduce((s, p) => s + p.uniqueBuyers, 0)}</p>
                    <p className="text-xs text-gray-500">Unique Buyers</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-[300px]">
                  <h3 className="text-sm font-semibold mb-3">Revenue Over Time</h3>
                  <div className="h-[230px]">
                    <Line data={{
                      labels: salesData.periodResults.map(p => p.period),
                      datasets: [{
                        label: 'Revenue',
                        data: salesData.periodResults.map(p => p.totalRevenue),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.1)',
                        fill: true,
                        tension: 0.3,
                      }]
                    }} options={chartOptions} />
                  </div>
                </div>

                {salesData.summary?.topProduct && (
                  <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Top Product: {salesData.summary.topProduct.productName}</p>
                      <p className="text-xs text-gray-500">{salesData.summary.topProduct.totalSold} units sold</p>
                    </div>
                    {salesData.summary?.topBuyer && (
                      <div className="ml-auto text-right">
                        <p className="text-sm font-bold text-gray-900">Top Buyer: {salesData.summary.topBuyer.shopName}</p>
                        <p className="text-xs text-gray-500">{fmt(salesData.summary.topBuyer.totalSpend)} total spend</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-3 font-semibold">Period</th>
                          <th className="px-4 py-3 font-semibold text-right">Orders</th>
                          <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                          <th className="px-4 py-3 font-semibold text-right">Avg Order Value</th>
                          <th className="px-4 py-3 font-semibold text-right">Buyers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {salesData.periodResults.map(p => (
                          <tr key={p.period} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">{p.period}</td>
                            <td className="px-4 py-3 text-right">{p.totalOrders}</td>
                            <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(p.totalRevenue)}</td>
                            <td className="px-4 py-3 text-right">{fmt(p.avgOrderValue)}</td>
                            <td className="px-4 py-3 text-right">{p.uniqueBuyers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : <p className="text-gray-400">No sales data for this period.</p>}
          </div>
        )}

        {/* ────── TURNOVER TAB ────── */}
        {activeTab === 'turnover' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loadingTurnover ? <p className="p-6 text-gray-400">Loading...</p> : sortedTurnover.length === 0 ? <p className="p-6 text-gray-400">No turnover data available. Ensure products have order history.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold cursor-pointer" onClick={() => handleSort('productName')}>Product {turnoverSort === 'productName' ? (turnoverDir === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 font-semibold text-right cursor-pointer" onClick={() => handleSort('unitsSold')}>Units Sold {turnoverSort === 'unitsSold' ? (turnoverDir === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 font-semibold text-right cursor-pointer" onClick={() => handleSort('avgStock')}>Avg Stock {turnoverSort === 'avgStock' ? (turnoverDir === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 font-semibold text-right cursor-pointer" onClick={() => handleSort('turnoverRate')}>Turnover Rate {turnoverSort === 'turnoverRate' ? (turnoverDir === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 font-semibold text-center">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedTurnover.map(p => (
                      <tr key={p.productId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{p.productName}</td>
                        <td className="px-4 py-3 text-right">{p.unitsSold}</td>
                        <td className="px-4 py-3 text-right">{p.avgStock}</td>
                        <td className="px-4 py-3 text-right font-semibold">{p.turnoverRate}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            p.flag === 'fast' ? 'bg-green-50 text-green-700' :
                            p.flag === 'normal' ? 'bg-blue-50 text-blue-700' :
                            'bg-red-50 text-red-700'
                          }`}>{p.flag}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ────── PROFIT/LOSS TAB ────── */}
        {activeTab === 'profit-loss' && (
          <div className="space-y-6">
            {loadingPL ? <p className="text-gray-400">Loading...</p> : profitLoss.length === 0 ? <p className="text-gray-400">No profit/loss data available.</p> : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{fmt(profitLoss.reduce((s, p) => s + p.revenue, 0))}</p>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                  </div>
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{fmt(profitLoss.reduce((s, p) => s + p.cogs, 0))}</p>
                    <p className="text-xs text-gray-500">Total COGS</p>
                  </div>
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{fmt(profitLoss.reduce((s, p) => s + p.grossProfit, 0))}</p>
                    <p className="text-xs text-gray-500">Gross Profit</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-[350px]">
                  <h3 className="text-sm font-semibold mb-3">Monthly Profit / Loss</h3>
                  <div className="h-[280px]">
                    <Bar data={{
                      labels: profitLoss.map(p => p.month),
                      datasets: [
                        { label: 'Revenue', data: profitLoss.map(p => p.revenue), backgroundColor: '#10b981', borderRadius: 4 },
                        { label: 'COGS', data: profitLoss.map(p => p.cogs), backgroundColor: '#ef4444', borderRadius: 4 },
                      ]
                    }} options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
                      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { borderDash: [5, 5] } } },
                    }} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ────── WASTE ALERT TAB ────── */}
        {activeTab === 'waste' && (
          <div className="space-y-4">
            {loadingWaste ? (
              <p className="text-gray-400">Loading waste reduction suggestions...</p>
            ) : wasteData.length === 0 ? (
              <p className="text-gray-400">No products expiring soon. 🎉</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wasteData.map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">{item.productName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        item.urgency === 'high' ? 'bg-red-50 text-red-700' :
                        item.urgency === 'medium' ? 'bg-amber-50 text-amber-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>{item.urgency}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{item.suggestion}</p>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold inline-block ${
                      item.action === 'discount' ? 'bg-green-50 text-green-700' :
                      item.action === 'bundle' ? 'bg-indigo-50 text-indigo-700' :
                      item.action === 'return' ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {item.action === 'discount' ? '🏷️ Offer Discount' :
                       item.action === 'bundle' ? '📦 Create Bundle' :
                       item.action === 'return' ? '🔙 Return to Supplier' :
                       '🎁 Donate'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ────── RETENTION TAB ────── */}
        {activeTab === 'retention' && (
          <div className="space-y-6">
            {loadingRet ? <p className="text-gray-400">Loading...</p> : !retention ? <p className="text-gray-400">No retention data available.</p> : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                    <p className="text-3xl font-bold text-green-600">{retention.summary.repeatBuyers}</p>
                    <p className="text-sm text-green-700 font-semibold">Repeat Buyers</p>
                    <p className="text-xs text-green-500">Ordered more than once in 90 days</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                    <p className="text-3xl font-bold text-red-600">{retention.summary.atRiskBuyers}</p>
                    <p className="text-sm text-red-700 font-semibold">At-Risk Buyers</p>
                    <p className="text-xs text-red-500">No orders in last 30 days</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                    <p className="text-3xl font-bold text-blue-600">{retention.summary.newBuyers}</p>
                    <p className="text-sm text-blue-700 font-semibold">New Buyers</p>
                    <p className="text-xs text-blue-500">First order in last 30 days</p>
                  </div>
                </div>

                {retention.atRisk?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900">At-Risk Buyers — Send Nudge</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {retention.atRisk.map(b => (
                        <div key={b.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                          <div>
                            <p className="font-semibold text-gray-900">{b.shop_name}</p>
                            <p className="text-xs text-gray-500">Last order: {new Date(b.lastOrderDate).toLocaleDateString('en-IN')} · {b.totalOrders} orders · {fmt(b.totalSpend)}</p>
                          </div>
                          <button onClick={() => handleSendNudge(b.id, b.shop_name)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">Send Nudge</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
