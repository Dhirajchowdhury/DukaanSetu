import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../../context/AuthContext';
import { FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const close = () => setOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    close();
  };

  // Determine if we're on the dark hero (landing page)
  const isDark = location.pathname === '/';

  return (
    <nav className={`navbar ${isDark ? 'navbar--dark' : 'navbar--light'}`}>
      <div className="navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo" onClick={close}>
          <span className="navbar__logo-icon">📦</span>
          <span className="navbar__logo-text">DukaanSetu</span>
        </Link>

        {/* Desktop links */}
        <div className="navbar__links">
          {!isAuthenticated ? (
            <>
              <a href="#features" className="navbar__link">Features</a>
              <a href="#how-it-works" className="navbar__link">How it works</a>
              <a href="#roles" className="navbar__link">Roles</a>
              <Link to="/login" className="navbar__link">Sign In</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          ) : (
            <>
              <Link to={getDashboardPath(user)} className={`navbar__link ${location.pathname.startsWith('/dashboard') ? 'navbar__link--active' : ''}`}>Dashboard</Link>
              <Link to="/products"   className={`navbar__link ${isActive('/products')   ? 'navbar__link--active' : ''}`}>Products</Link>
              <Link to="/categories" className={`navbar__link ${isActive('/categories') ? 'navbar__link--active' : ''}`}>Categories</Link>
              <Link to="/reports"    className={`navbar__link ${isActive('/reports')    ? 'navbar__link--active' : ''}`}>Reports</Link>
              <button className="btn btn-ghost btn-sm navbar__logout" onClick={handleLogout}>
                <FiLogOut /> Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="navbar__toggle"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="navbar__overlay" onClick={close} />
          <div className="navbar__drawer">
            {!isAuthenticated ? (
              <>
                <a href="#features"    className="navbar__drawer-link" onClick={close}>Features</a>
                <a href="#how-it-works" className="navbar__drawer-link" onClick={close}>How it works</a>
                <a href="#roles"       className="navbar__drawer-link" onClick={close}>Roles</a>
                <Link to="/login"      className="navbar__drawer-link" onClick={close}>Sign In</Link>
                <Link to="/signup"     className="btn btn-primary btn-block" onClick={close}>Get Started</Link>
              </>
            ) : (
              <>
                <Link to={getDashboardPath(user)} className="navbar__drawer-link" onClick={close}>Dashboard</Link>
                <Link to="/products"   className="navbar__drawer-link" onClick={close}>Products</Link>
                <Link to="/categories" className="navbar__drawer-link" onClick={close}>Categories</Link>
                <Link to="/reports"    className="navbar__drawer-link" onClick={close}>Reports</Link>
                <Link to="/settings"   className="navbar__drawer-link" onClick={close}>Settings</Link>
                <button className="btn btn-danger btn-block" onClick={handleLogout}>
                  <FiLogOut /> Logout
                </button>
              </>
            )}
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
