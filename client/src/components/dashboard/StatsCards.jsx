import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiAlertTriangle, FiClock, FiTrendingUp } from 'react-icons/fi';

const StatsCards = ({ stats, products }) => {
  const navigate = useNavigate();

  const cards = [
    {
      icon: <FiPackage />,
      label: 'TOTAL PRODUCTS',
      value: stats?.totalItems ?? '—',
      sub: 'items in inventory',
      iconClass: 'bg-indigo-50 text-indigo-600',
      path: '/products',
    },
    {
      icon: <FiAlertTriangle />,
      label: 'LOW STOCK',
      value: stats?.lowStockCount ?? '—',
      sub: 'need restocking',
      iconClass: 'bg-amber-50 text-amber-500',
      path: '/reports?filter=low',
    },
    {
      icon: <FiClock />,
      label: 'EXPIRING SOON',
      value: stats?.expiringSoonCount ?? '—',
      sub: 'within 7 days',
      iconClass: 'bg-red-50 text-red-500',
      path: '/reports?filter=expiring',
    },
    {
      icon: <FiTrendingUp />,
      label: 'INVENTORY VALUE',
      value: stats ? `₹${(stats.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—',
      sub: 'total stock value',
      iconClass: 'bg-yellow-50 text-yellow-600',
      path: '/products',
    },
  ];

  const cardStyle = "bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center gap-5 min-h-[110px] md:min-h-[120px] hover:shadow-md transition cursor-pointer w-full";
  const iconContainerStyle = "p-3.5 rounded-2xl text-2xl flex-shrink-0 flex items-center justify-center";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 w-full">
      {cards.map((card, i) => (
        <div
          key={i}
          className={cardStyle}
          onClick={() => navigate(card.path)}
        >
          <div className={`${iconContainerStyle} ${card.iconClass}`}>
            {card.icon}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">{card.label}</p>
            <h2 className="text-xl lg:text-2xl font-extrabold text-gray-800 mt-1 truncate">
              {stats === null ? '—' : card.value}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
