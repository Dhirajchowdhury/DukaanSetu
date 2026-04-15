import { useEffect } from 'react';
import { useProducts } from '../../context/ProductContext';
import DashboardShell from '../../components/dashboard/DashboardShell';
import '../../components/dashboard/DashboardShell.css';

const WS_TIPS = [
  { icon: '🏭', title: 'Bulk Inventory', desc: 'Manage large-volume stock with category-level filtering and sorting.' },
  { icon: '💰', title: 'Value Tracking', desc: 'Monitor total inventory value across all categories in real-time.' },
  { icon: '📈', title: 'Category Reports', desc: 'Use Reports to see which categories hold the most stock value.' },
];

const WholesalerDashboard = () => {
  const { stats, fetchStats, fetchProducts } = useProducts();

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 8 });
  }, []);

  return (
    <DashboardShell
      roleName="Wholesaler"
      roleIcon="🏭"
      accentColor="var(--accent)"
      stats={stats}
      extraContent={
        <div className="ds-info-grid">
          {WS_TIPS.map(t => (
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

export default WholesalerDashboard;
