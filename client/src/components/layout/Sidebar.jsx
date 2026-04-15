import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome, FiBox, FiTag, FiBarChart2, FiSettings,
  FiLogOut, FiMenu, FiX, FiChevronRight,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/dashboard',  icon: <FiHome />,     label: 'Dashboard' },
  { path: '/products',   icon: <FiBox />,      label: 'Products' },
  { path: '/categories', icon: <FiTag />,      label: 'Categories' },
  { path: '/reports',    icon: <FiBarChart2 />, label: 'Reports' },
  { path: '/settings',   icon: <FiSettings />, label: 'Settings' },
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
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <p className="sidebar__nav-label">Menu</p>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar__item ${active ? 'sidebar__item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              <span className="sidebar__item-label">{item.label}</span>
              {active && <FiChevronRight className="sidebar__item-arrow" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="sidebar__footer">
        <button className="sidebar__logout" onClick={handleLogout}>
          <FiLogOut />
          <span>Logout</span>
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
