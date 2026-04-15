import { useEffect } from 'react';
import { useProducts } from '../../context/ProductContext';
import DashboardShell from '../../components/dashboard/DashboardShell';
import '../../components/dashboard/DashboardShell.css';

const QUICK_TIPS = [
  { icon: '📦', title: 'Add Products', desc: 'Use the Products page to add new stock with categories and expiry dates.' },
  { icon: '🔔', title: 'Set Thresholds', desc: 'Configure low-stock thresholds in Settings → Notifications.' },
  { icon: '📊', title: 'View Reports', desc: 'Check the Reports page for category breakdowns and expiry alerts.' },
];

const ShopOwnerDashboard = () => {
  const { stats, fetchStats, fetchProducts } = useProducts();

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 8 });
  }, []);

  return (
    <DashboardShell
      roleName="Shop Owner"
      roleIcon="🏪"
      accentColor="var(--primary)"
      stats={stats}
      extraContent={
        <div className="ds-info-grid">
          {QUICK_TIPS.map(t => (
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

export default ShopOwnerDashboard;
