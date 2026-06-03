import React, { useMemo, useState, useEffect } from 'react';
import StatsCards from './StatsCards';
import AiChat from './AiChat';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import { ProductFormModal } from '../../features/inventory/components/ProductFormModal';
import { Line, Bar, Pie } from 'react-chartjs-2';
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

ChartJS.register(
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
);

const PROD_TIPS = [
  { icon: '🌾', title: 'Raw Materials', desc: 'Track raw material stock separately using dedicated categories.' },
  { icon: '🏷️', title: 'Batch Tracking', desc: 'Add batch numbers and manufacture dates to every product entry.' },
  { icon: '⏰', title: 'Expiry Monitoring', desc: 'Set expiry dates on finished goods to get 7-day advance alerts.' },
];

const QUICK_TIPS = [
  { icon: '📦', title: 'Add Products', desc: 'Use the Products page to add new stock with categories and expiry dates.' },
  { icon: '🔔', title: 'Set Thresholds', desc: 'Configure low-stock thresholds in Settings → Notifications.' },
  { icon: '📊', title: 'View Reports', desc: 'Check the Reports page for category breakdowns and expiry alerts.' },
];

const DIST_TIPS = [
  { icon: '🚚', title: 'Outgoing Stock', desc: 'Track products dispatched to retailers and monitor delivery batches.' },
  { icon: '📋', title: 'Batch Numbers', desc: 'Use batch numbers when adding products to trace distribution lots.' },
  { icon: '🔄', title: 'Stock Correction', desc: 'Use the stock adjustment feature to reconcile physical counts.' },
];

const WS_TIPS = [
  { icon: '🏭', title: 'Bulk Inventory', desc: 'Manage large-volume stock with category-level filtering and sorting.' },
  { icon: '💰', title: 'Value Tracking', desc: 'Monitor total inventory value across all categories in real-time.' },
  { icon: '📈', title: 'Category Reports', desc: 'Use Reports to see which categories hold the most stock value.' },
];

const DashboardContent = () => {
  const { products, stats, createProduct, fetchStats, fetchProducts } = useProducts();
  const { user } = useAuth();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [duesSummary, setDuesSummary] = useState(null);
  const [restockSuggestions, setRestockSuggestions] = useState([]);
  const [bundleSuggestions, setBundleSuggestions] = useState([]);
  const [festivalData, setFestivalData] = useState([]);
  const [expandedFestival, setExpandedFestival] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 1000 });
    fetchAnalytics();
    fetchDues();
    fetchRestockSuggestions();
    fetchBundleSuggestions();
    fetchFestivalSuggestions();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const api = (await import('../../services/api')).default;
      const { data } = await api.get('/analytics');
      setAnalytics(data);
    } catch {}
  };

  const fetchDues = async () => {
    try {
      const api = (await import('../../services/api')).default;
      const { data } = await api.get('/dues');
      setDuesSummary(data.summary);
    } catch {}
  };

  const fetchRestockSuggestions = async () => {
    try {
      const api = (await import('../../services/api')).default;
      const { data } = await api.get('/analytics/restock-suggestions');
      setRestockSuggestions(data.suggestions || []);
    } catch {}
  };

  const fetchBundleSuggestions = async () => {
    try {
      const api = (await import('../../services/api')).default;
      const { data } = await api.get('/ai/bundle-suggestions');
      setBundleSuggestions(data.bundles || []);
    } catch {}
  };

  const fetchFestivalSuggestions = async () => {
    try {
      const api = (await import('../../services/api')).default;
      const { data } = await api.get('/ai/festival-suggestions');
      setFestivalData(data.festivals || []);
    } catch {}
  };

  const tips = useMemo(() => {
    if (user?.role === 'producer') return PROD_TIPS;
    if (user?.role === 'distributor') return DIST_TIPS;
    if (user?.role === 'wholesaler') return WS_TIPS;
    return QUICK_TIPS;
  }, [user]);

  const handleAddProductSubmit = async (productData) => {
    try {
      await createProduct(productData);
      setIsAddProductOpen(false);
      await fetchStats();
      await fetchProducts({ limit: 1000 });
    } catch (err) {
      console.error('Failed to create product:', err);
    }
  };

  // 1. Stock Growth Graph Data
  const stockGrowthData = useMemo(() => {
    if (!products || products.length === 0) return { labels: [], datasets: [] };

    const sorted = [...products].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const dailyQuantities = {};
    sorted.forEach(p => {
      const dateStr = new Date(p.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dailyQuantities[dateStr] = (dailyQuantities[dateStr] || 0) + (p.quantity || 0);
    });

    const labels = Object.keys(dailyQuantities);
    const rawCounts = Object.values(dailyQuantities);

    const cumulative = [];
    let cumulativeSum = 0;
    rawCounts.forEach(val => {
      cumulativeSum += val;
      cumulative.push(cumulativeSum);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Total Stock Volume',
          data: cumulative,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#10b981',
        }
      ]
    };
  }, [products]);

  // 2. Products Added Over Time Data
  const productsAddedData = useMemo(() => {
    if (!products || products.length === 0) return { labels: [], datasets: [] };

    const sorted = [...products].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const dailyCounts = {};

    sorted.forEach(p => {
      const dateStr = new Date(p.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    });

    return {
      labels: Object.keys(dailyCounts),
      datasets: [
        {
          label: 'Products Added Count',
          data: Object.values(dailyCounts),
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        }
      ]
    };
  }, [products]);

  // 3. Category Distribution Data
  const categoryDistributionData = useMemo(() => {
    if (!stats?.categoryStats || stats.categoryStats.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = stats.categoryStats.map(c => `${c.icon} ${c.name}`);
    const counts = stats.categoryStats.map(c => c.count);

    return {
      labels,
      datasets: [
        {
          label: 'Products Tally',
          data: counts,
          backgroundColor: [
            '#0d9488', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
            '#10b981', '#ef4444', '#6366f1', '#84cc16', '#14b8a6'
          ],
          borderWidth: 1,
        }
      ]
    };
  }, [stats]);

  // Chart configuration options
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth: 12, font: { size: 11 } },
      },
    },
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* 1. STATS */}
      <StatsCards stats={stats} products={products} />

      {/* Sales Drop Alert */}
      {analytics?.salesDropAlert && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-red-700">Sales dropped {analytics.salesDropAlert.dropPercent}% vs last week</p>
            <p className="text-sm text-red-500">
              {analytics.salesDropAlert.thisWeek} orders this week vs {analytics.salesDropAlert.lastWeek} last week
            </p>
          </div>
        </div>
      )}

      {/* Pending Dues Summary Card */}
      {duesSummary && duesSummary.orderCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer"
          onClick={() => window.location.href = '/dues'}
        >
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-bold text-amber-700">₹{duesSummary.totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })} pending from {duesSummary.orderCount} orders</p>
            <p className="text-sm text-amber-500">Click to view and send reminders</p>
          </div>
        </div>
      )}

      {/* Seasonal Suggestions Widget */}
      {analytics?.seasonal?.products?.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🌾</span>
            <h3 className="font-bold text-gray-800">This Month's Hot Products — Peak Season</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {analytics.seasonal.products.map(p => (
              <div key={p.id} className="bg-white rounded-lg px-4 py-2 shadow-sm border border-green-100 flex items-center gap-3">
                <span className="text-lg">📦</span>
                <div>
                  <p className="font-semibold text-sm">{p.productName}</p>
                  <p className="text-xs text-gray-500">{p.quantity} {p.unit} — ₹{parseFloat(p.sellingPrice || 0).toFixed(2)}</p>
                </div>
              </div>
            ))}
            {analytics.seasonal.suggestedCategories?.length > 0 && (
              <div className="w-full mt-1">
                <p className="text-xs text-gray-500">
                  Suggested categories: {analytics.seasonal.suggestedCategories.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restock Suggestions Widget */}
      {restockSuggestions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h3 className="font-bold text-gray-800">Restock Needed — {restockSuggestions.length} product(s)</h3>
          </div>
          <div className="space-y-3">
            {restockSuggestions.slice(0, 5).map(s => (
              <div key={s.productId} className="bg-white rounded-lg p-4 border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{s.productName}</p>
                  <p className="text-xs text-gray-500">
                    {s.daysOfStockLeft} days left · {s.currentStock} {s.unit} in stock
                    {s.avgDailySales > 0 && ` · ~${s.avgDailySales}/day avg`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold text-red-600">Order {s.suggestedOrderQty}</span>
                  {s.bestSupplier ? (
                    <button
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                      onClick={() => window.location.href = `/connect/profile/${s.bestSupplier.supplierId}`}
                    >
                      Buy from {s.bestSupplier.shopName} @ ₹{s.bestSupplier.price}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">No connected supplier</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ADD PRODUCT BUTTON (CENTERED) */}
      <div className="flex justify-center py-4 my-2">
        <button
          style={{
            padding: '16px 48px',
            fontSize: '16px',
            fontWeight: '700',
            borderRadius: '12px',
            backgroundColor: '#2563eb', // blue-600
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 15px -3px rgba(37,99,235,0.3), 0 4px 6px -2px rgba(37,99,235,0.1)',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
          }}
          className="hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => setIsAddProductOpen(true)}
        >
          <span style={{ fontSize: '22px', lineHeight: '1', fontWeight: '700' }}>+</span> Add Product
        </button>
      </div>

      {/* 3. FEATURE CARDS */}
      {tips && tips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition flex gap-5 items-start min-h-[110px]"
            >
              {tip.icon && <span className="text-3xl flex-shrink-0">{tip.icon}</span>}
              <div>
                <h3 className="font-bold text-gray-800 mb-1.5">{tip.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. INSIGHTS */}
      <div className="mt-4 md:mt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-5">
          Inventory Insights
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="bg-white rounded-xl border border-gray-200 p-5 h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold mb-3">Stock Growth</h3>
            <div className="flex-1 min-h-0 relative">
              <Line data={stockGrowthData} options={lineOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold mb-3">Products Added Over Time</h3>
            <div className="flex-1 min-h-0 relative">
              <Bar data={productsAddedData} options={barOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold mb-3">Category Distribution</h3>
            <div className="flex-1 min-h-0 relative">
              <Pie data={categoryDistributionData} options={pieOptions} />
            </div>
          </div>

        </div>
      </div>

      {/* Bundle Suggestions */}
      {bundleSuggestions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Bundle Ideas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundleSuggestions.map((b, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">{b.bundleName}</h3>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  {b.products?.map((p, j) => (
                    <div key={j}>{p.name} x{p.qty}</div>
                  ))}
                </div>
                <p className="text-sm font-bold text-indigo-600">₹{b.suggestedPrice}</p>
                <p className="text-xs text-gray-400 mt-2">{b.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Festival Prep */}
      {festivalData.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Festival Prep</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {festivalData.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedFestival(expandedFestival === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎉</span>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{f.festival}</p>
                      <p className="text-xs text-gray-500">{f.daysAway} days away</p>
                    </div>
                  </div>
                  <span style={{ transform: expandedFestival === i ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
                </button>
                {expandedFestival === i && (
                  <div className="px-5 pb-4 space-y-2">
                    {f.products?.map((p, j) => (
                      <div key={j} className="bg-gray-50 rounded-lg p-3">
                        <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL */}
      <ProductFormModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSubmit={handleAddProductSubmit}
      />
      <AiChat />
    </div>
  );
};

export default DashboardContent;