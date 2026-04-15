import { useEffect } from 'react';
import { FiPackage, FiAlertTriangle, FiClock, FiTrendingUp, FiTag } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import { useProducts } from '../context/ProductContext';
import './Dashboard.css';
import './Reports.css';

const Reports = () => {
  const { stats, fetchStats, products, fetchProducts, categories } = useProducts();

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 100 });
  }, []);

  const lowStockItems = products.filter(p => p.isLowStock && p.quantity > 0);
  const outOfStock   = products.filter(p => p.quantity === 0);
  const expiringSoon = products.filter(p => p.isExpiringSoon);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header">
          <h1>Reports & Analytics</h1>
          <p>Insights into your inventory health.</p>
        </div>

        {/* Summary row */}
        <div className="reports-summary">
          {[
            { icon: <FiPackage />, label: 'Total Products', value: stats?.totalItems ?? '—', color: 'primary' },
            { icon: <FiTrendingUp />, label: 'Inventory Value', value: stats ? `₹${(stats.totalValue||0).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—', color: 'success' },
            { icon: <FiAlertTriangle />, label: 'Low Stock', value: stats?.lowStockCount ?? '—', color: 'warning' },
            { icon: <FiClock />, label: 'Expiring Soon', value: stats?.expiringSoonCount ?? '—', color: 'danger' },
          ].map((s, i) => (
            <div key={i} className={`report-stat card report-stat--${s.color}`}>
              <div className={`report-stat__icon report-stat__icon--${s.color}`}>{s.icon}</div>
              <div>
                <p className="report-stat__value">{s.value}</p>
                <p className="report-stat__label">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="reports-grid">
          {/* Category breakdown */}
          <div className="card reports-section">
            <h3 className="reports-section__title"><FiTag /> Category Breakdown</h3>
            {stats?.categoryStats?.length ? (
              <div className="cat-breakdown">
                {stats.categoryStats.map((c, i) => (
                  <div key={i} className="cat-breakdown__row">
                    <span className="cat-breakdown__name">{c.icon} {c.name}</span>
                    <div className="cat-breakdown__bar-wrap">
                      <div
                        className="cat-breakdown__bar"
                        style={{ width: `${Math.min(100, (c.count / (stats.totalItems || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="cat-breakdown__count">{c.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: 14 }}>No data yet.</p>
            )}
          </div>

          {/* Low stock list */}
          <div className="card reports-section">
            <h3 className="reports-section__title"><FiAlertTriangle style={{ color: 'var(--warning)' }} /> Low Stock Items</h3>
            {lowStockItems.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14 }}>All items are well stocked 🎉</p>
            ) : (
              <div className="report-list">
                {lowStockItems.slice(0, 10).map(p => (
                  <div key={p._id} className="report-list__row">
                    <span className="report-list__name">{p.productName}</span>
                    <span className="badge badge-warning">{p.quantity} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Out of stock */}
          <div className="card reports-section">
            <h3 className="reports-section__title"><FiPackage style={{ color: 'var(--danger)' }} /> Out of Stock</h3>
            {outOfStock.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14 }}>No items are out of stock 🎉</p>
            ) : (
              <div className="report-list">
                {outOfStock.slice(0, 10).map(p => (
                  <div key={p._id} className="report-list__row">
                    <span className="report-list__name">{p.productName}</span>
                    <span className="badge badge-danger">Out of Stock</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiring soon */}
          <div className="card reports-section">
            <h3 className="reports-section__title"><FiClock style={{ color: 'var(--danger)' }} /> Expiring Soon</h3>
            {expiringSoon.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14 }}>No items expiring within 7 days 🎉</p>
            ) : (
              <div className="report-list">
                {expiringSoon.slice(0, 10).map(p => (
                  <div key={p._id} className="report-list__row">
                    <span className="report-list__name">{p.productName}</span>
                    <span className="badge badge-danger">
                      {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;
