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
      iconBg: '#eef2ff',
      iconColor: '#4f46e5',
      path: '/products',
    },
    {
      icon: <FiAlertTriangle />,
      label: 'LOW STOCK',
      value: stats?.lowStockCount ?? '—',
      sub: 'need restocking',
      iconBg: '#fffbeb',
      iconColor: '#f59e0b',
      path: '/reports?filter=low',
    },
    {
      icon: <FiClock />,
      label: 'EXPIRING SOON',
      value: stats?.expiringSoonCount ?? '—',
      sub: 'within 7 days',
      iconBg: '#fef2f2',
      iconColor: '#ef4444',
      path: '/reports?filter=expiring',
    },
    {
      icon: <FiTrendingUp />,
      label: 'INVENTORY VALUE',
      value: stats
        ? `₹${(stats.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        : '—',
      sub: 'total stock value',
      iconBg: '#fefce8',
      iconColor: '#ca8a04',
      path: '/products',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        width: '100%',
      }}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          onClick={() => navigate(card.path)}
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            minHeight: '100px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'box-shadow .15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'}
        >
          {/* Icon — fixed 48×48, flex-shrink-0 so text can't push it */}
          <div
            style={{
              width: '48px',
              height: '48px',
              minWidth: '48px',
              borderRadius: '12px',
              background: card.iconBg,
              color: card.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              flexShrink: 0,
            }}
          >
            {card.icon}
          </div>

          {/* Text — flex column so label/value/sub stack cleanly */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#9ca3af',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.label}
            </p>

            <p
              style={{
                fontSize: '28px',
                fontWeight: 500,
                color: '#111827',
                lineHeight: 1.15,
                margin: '4px 0 3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {stats === null ? '—' : card.value}
            </p>

            <p
              style={{
                fontSize: '13px',
                color: '#9ca3af',
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {card.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
