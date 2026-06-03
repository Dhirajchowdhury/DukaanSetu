import React, { useMemo, useState, useEffect } from 'react';
import StatsCards from './StatsCards';
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

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 1000 });
  }, []);

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

      {/* MODAL */}
      <ProductFormModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSubmit={handleAddProductSubmit}
      />
    </div>
  );
};

export default DashboardContent;