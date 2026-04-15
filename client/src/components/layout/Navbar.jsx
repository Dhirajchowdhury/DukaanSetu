import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaBars, FaTimes } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMobileMenu}>
          <span className="logo-icon">📦</span>
          <span className="logo-text">DukaanSetu</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          {!isAuthenticated ? (
            <>
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Home
              </Link>
              <a 
                href="#features" 
                className="nav-link"
                onClick={closeMobileMenu}
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                className="nav-link"
                onClick={closeMobileMenu}
              >
                How It Works
              </a>
              <Link 
                to="/login" 
                className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="nav-btn"
                onClick={closeMobileMenu}
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <Link 
                to="/dashboard" 
                className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Dashboard
              </Link>
              <Link 
                to="/products" 
                className={`nav-link ${isActive('/products') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Products
              </Link>
              <Link 
                to="/categories" 
                className={`nav-link ${isActive('/categories') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Categories
              </Link>
              <Link 
                to="/reports" 
                className={`nav-link ${isActive('/reports') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Reports
              </Link>
              <button 
                onClick={() => {
                  logout();
                  closeMobileMenu();
                }} 
                className="nav-btn logout-btn"
              >
                Logout...
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
