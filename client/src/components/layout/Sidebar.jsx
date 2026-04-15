import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaBox, FaTags, FaChartBar, FaCog, FaBarcode } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Dashboard' },
    { path: '/products', icon: <FaBox />, label: 'Products' },
    { path: '/categories', icon: <FaTags />, label: 'Categories' },
    { path: '/reports', icon: <FaChartBar />, label: 'Reports' },
    { path: '/settings', icon: <FaCog />, label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/dashboard" className="sidebar-logo">
          <span className="logo-icon">📦</span>
          <span className="logo-text">DukaanSetu</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-primary btn-scan">
          <FaBarcode /> Scan Product
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
