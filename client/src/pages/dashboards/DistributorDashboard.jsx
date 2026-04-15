import { useEffect } from 'react';
import { useProducts } from '../../context/ProductContext';
import DashboardShell from '../../components/dashboard/DashboardShell';
import '../../components/dashboard/DashboardShell.css';

const DIST_TIPS = [
  { icon: '🚚', title: 'Outgoing Stock', desc: 'Track products dispatched to retailers and monitor delivery batches.' },
  { icon: '📋', title: 'Batch Numbers', desc: 'Use batch numbers when adding products to trace distribution lots.' },
  { icon: '🔄', title: 'Stock Correction', desc: 'Use the stock adjustment feature to reconcile physical counts.' },
];

const DistributorDashboard = () => {
  const { stats, fetchStats, fetchProducts } = useProducts();

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 8 });
  }, []);

  return (
    <DashboardShell
      roleName="Distributor"
      roleIcon="🚚"
      accentColor="#7C3AED"
      stats={stats}
      extraContent={
        <div className="ds-info-grid">
          {DIST_TIPS.map(t => (
            <div key={t.title} className="ds-info-card">
              <span className="ds-info-card__icon">{t.icon}</span>
              <div>
                <p className="ds-info-card__title">{t.title}</p>
                <p className="ds-info-card__desc">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
};

export default DistributorDashboard;
