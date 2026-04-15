import { useEffect } from 'react';
import { useProducts } from '../../context/ProductContext';
import DashboardShell from '../../components/dashboard/DashboardShell';
import '../../components/dashboard/DashboardShell.css';

const PROD_TIPS = [
  { icon: '🌾', title: 'Raw Materials', desc: 'Track raw material stock separately using dedicated categories.' },
  { icon: '🏷️', title: 'Batch Tracking', desc: 'Add batch numbers and manufacture dates to every product entry.' },
  { icon: '⏰', title: 'Expiry Monitoring', desc: 'Set expiry dates on finished goods to get 7-day advance alerts.' },
];

const ProducerDashboard = () => {
  const { stats, fetchStats, fetchProducts } = useProducts();

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 8 });
  }, []);

  return (
    <DashboardShell
      roleName="Producer"
      roleIcon="🌾"
      accentColor="var(--warning)"
      stats={stats}
      extraContent={
        <div className="ds-info-grid">
          {PROD_TIPS.map(t => (
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

export default ProducerDashboard;
