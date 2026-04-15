import { FiPackage, FiAlertTriangle, FiClock, FiTrendingUp } from 'react-icons/fi';
import './StatsCards.css';

const StatsCards = ({ stats }) => {
  const cards = [
    {
      icon: <FiPackage />,
      label: 'Total Products',
      value: stats?.totalItems ?? '—',
      sub: 'items in inventory',
      color: 'primary',
    },
    {
      icon: <FiAlertTriangle />,
      label: 'Low Stock',
      value: stats?.lowStockCount ?? '—',
      sub: 'need restocking',
      color: 'warning',
    },
    {
      icon: <FiClock />,
      label: 'Expiring Soon',
      value: stats?.expiringSoonCount ?? '—',
      sub: 'within 7 days',
      color: 'danger',
    },
    {
      icon: <FiTrendingUp />,
      label: 'Inventory Value',
      value: stats ? `₹${(stats.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—',
      sub: 'total stock value',
      color: 'success',
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, i) => (
        <div key={i} className={`stat-card stat-card--${card.color}`}>
          <div className="stat-card__icon-wrap">
            {card.icon}
          </div>
          <div className="stat-card__body">
            <p className="stat-card__label">{card.label}</p>
            <p className="stat-card__value">
              {stats === null ? <span className="spinner" /> : card.value}
            </p>
            <p className="stat-card__sub">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
