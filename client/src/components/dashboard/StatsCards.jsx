import { FaBox, FaExclamationTriangle, FaClock, FaDollarSign } from 'react-icons/fa';
import './StatsCards.css';

const StatsCards = ({ stats }) => {
  if (!stats) {
    return <div className="stats-loading">Loading stats...</div>;
  }

  const cards = [
    {
      icon: <FaBox />,
      label: 'Total Items',
      value: stats.totalItems || 0,
      color: 'primary',
    },
    {
      icon: <FaExclamationTriangle />,
      label: 'Low Stock',
      value: stats.lowStockCount || 0,
      color: 'warning',
    },
    {
      icon: <FaClock />,
      label: 'Expiring Soon',
      value: stats.expiringSoonCount || 0,
      color: 'error',
    },
    {
      icon: <FaDollarSign />,
      label: 'Total Value',
      value: `$${(stats.totalValue || 0).toFixed(2)}`,
      color: 'success',
    },
  ];

  return (
    <div className="stats-cards">
      {cards.map((card, index) => (
        <div key={index} className={`stat-card card stat-${card.color}`}>
          <div className="stat-icon">{card.icon}</div>
          <div className="stat-content">
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
