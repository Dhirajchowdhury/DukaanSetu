import Sidebar from '../layout/Sidebar';
import StatsCards from './StatsCards';
import ProductTable from './ProductTable';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import '../layout/Sidebar.css';
import '../../pages/Dashboard.css';

/**
 * DashboardShell — shared layout used by all four role dashboards.
 * Each role page passes its own `accentColor`, `roleIcon`, and optional
 * `extraContent` slot for role-specific widgets.
 */
const DashboardShell = ({
  roleName,
  roleIcon,
  accentColor = 'var(--primary)',
  stats,
  extraContent,
}) => {
  const { user } = useAuth();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        {/* Role banner */}
        <div className="ds-role-banner" style={{ borderColor: accentColor }}>
          <div className="ds-role-banner__left">
            <span className="ds-role-banner__icon">{roleIcon}</span>
            <div>
              <p className="ds-role-banner__label">Dashboard</p>
              <h1 className="ds-role-banner__title" style={{ color: accentColor }}>
                {roleName}
              </h1>
            </div>
          </div>
          <div className="ds-role-banner__right">
            <p className="ds-role-banner__greeting">
              {greeting()}, <strong>{user?.shopName}</strong> 👋
            </p>
            <p className="ds-role-banner__sub">
              Here's your inventory overview for today.
            </p>
          </div>
        </div>

        <StatsCards stats={stats} />

        {/* Role-specific widgets */}
        {extraContent && (
          <div className="ds-extra">{extraContent}</div>
        )}

        <ProductTable compact />
      </main>
    </div>
  );
};

export default DashboardShell;
