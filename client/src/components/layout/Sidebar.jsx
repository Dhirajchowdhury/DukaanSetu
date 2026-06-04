import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome, FiBox, FiTag, FiBarChart2, FiSettings,
  FiLogOut, FiMenu, FiX, FiChevronRight, FiShare2, FiShoppingBag, FiRefreshCw,
  FiCamera, FiActivity, FiTrendingUp, FiDollarSign, FiMoon, FiUsers, FiCalendar,
  FiMessageSquare, FiPercent, FiGlobe, FiMic
} from 'react-icons/fi';
import { useAuth, getDashboardPath } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: null,              icon: <FiHome />,       labelKey: 'dashboard',        isDashboard: true },
  { path: '/products',       icon: <FiBox />,        labelKey: 'inventory' },
  { path: '/inventory/history', icon: <FiCamera />,  labelKey: 'stockHistory' },
  { path: '/connect',        icon: <FiShare2 />,     labelKey: 'connect' },
  { path: '/orders',         icon: <FiShoppingBag />, labelKey: 'orders' },
  { path: '/reorder-rules',  icon: <FiRefreshCw />,  labelKey: 'autoReorder' },
  { path: '/categories',     icon: <FiTag />,        labelKey: 'categories' },
  { path: '/product-ranking', icon: <FiTrendingUp />, labelKey: 'productRanking' },
  { path: '/customers',      icon: <FiUsers />,      labelKey: 'customers' },
  { path: '/subscriptions',  icon: <FiCalendar />,   labelKey: 'subscriptions' },
  { path: '/feedback',       icon: <FiMessageSquare />, labelKey: 'feedback' },
  { path: '/discounts',      icon: <FiPercent />,    labelKey: 'discounts' },
  { path: '/dues',           icon: <FiDollarSign />, labelKey: 'pendingDues' },
  { path: '/expenses',       icon: <FiDollarSign />, labelKey: 'expenses' },
  { path: '/finance',        icon: <FiTrendingUp />, labelKey: 'finance' },
  { path: '/activity',       icon: <FiActivity />,   labelKey: 'activityLog' },
  { path: '/reports',        icon: <FiBarChart2 />,  labelKey: 'reports' },
  { path: '/settings',       icon: <FiSettings />,   labelKey: 'settings' },
];

const ROLE_LABELS = {
  shop_owner:  'Shop Owner',
  distributor: 'Distributor',
  wholesaler:  'Wholesaler',
  producer:    'Producer',
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const activeRef = useRef(null);

  // Auto-scroll the active nav item into view whenever the route changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      {/* Logo */}
      <div className="sidebar__logo">
        <Link to="/dashboard" className="sidebar__brand" onClick={() => setMobileOpen(false)}>
          <span className="sidebar__brand-icon">📦</span>
          <span className="sidebar__brand-name">DukaanSetu</span>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="sidebar__user">
          <div className="sidebar__avatar">
            {user.shopName?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar__user-info">
            <p className="sidebar__user-name">{user.shopName}</p>
            <span className="badge badge-primary sidebar__role-badge">
              {ROLE_LABELS[user.role] || 'Shop Owner'}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar__nav">
        <p className="sidebar__nav-label">{t('nav.dashboard')}</p>
        {NAV_ITEMS.map((item) => {
          // Dashboard path is role-specific
          const resolvedPath = item.isDashboard ? getDashboardPath(user) : item.path;

          // FIX: exact matching for every leaf route — no startsWith on items
          // that share a prefix with another nav item.
          const active = item.isDashboard
            // Dashboard: startsWith is correct because the resolved path is
            // /dashboard/shop-owner etc. — no other nav item shares /dashboard
            ? location.pathname.startsWith('/dashboard')
            : item.path === '/products'
              // /products is EXACT — /inventory/history must NOT activate it
              ? location.pathname === '/products'
            : item.path === '/connect'
              // /connect covers the marketplace + profile detail pages
              ? (location.pathname === '/connect' || location.pathname.startsWith('/connect/') || location.pathname.startsWith('/profile'))
            : item.path !== null
              // All other items: exact match only — fixes the double-highlight bug
              ? location.pathname === item.path
            : false;
          return (
            <Link
              key={item.labelKey}
              to={resolvedPath}
              ref={active ? activeRef : null}
              className={`sidebar__item ${active ? 'sidebar__item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              <span className="sidebar__item-label">{t(`nav.${item.labelKey}`)}</span>
              {active && <FiChevronRight className="sidebar__item-arrow" />}
            </Link>
          );
        })}
      </nav>

      {/* Language toggle */}
      <div className="sidebar__footer">
        <button className="sidebar__logout" onClick={() => {
          const next = i18n.language === 'en' ? 'bn' : 'en';
          i18n.changeLanguage(next);
          localStorage.setItem('lang', next);
        }} title="Switch language">
          <FiGlobe />
          <span>{i18n.language === 'en' ? 'বাংলা' : 'English'}</span>
        </button>
      </div>
      {/* Dark mode toggle */}
      <div className="sidebar__footer">
        <button
          className="sidebar__logout"
          onClick={() => {
            const html = document.documentElement;
            const isDark = html.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
          }}
          title="Toggle dark mode"
        >
          <FiMoon />
          <span>{t('nav.darkMode')}</span>
        </button>
      </div>
      <div className="sidebar__footer" style={{ borderTop: 'none' }}>
        <button className="sidebar__logout" onClick={handleLogout}>
          <FiLogOut />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="sidebar__mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="sidebar__overlay" onClick={() => setMobileOpen(false)} />
      )}

      {sidebarContent}
    </>
  );
};

export default Sidebar;
