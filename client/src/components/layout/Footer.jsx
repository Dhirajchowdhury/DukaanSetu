import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="container footer__inner">
      {/* Brand */}
      <div className="footer__brand">
        <Link to="/" className="footer__logo">
          <span>📦</span>
          <span className="footer__logo-text">DukaanSetu</span>
        </Link>
        <p className="footer__tagline">
          Smart inventory management for modern Indian businesses.
        </p>
      </div>

      {/* Links */}
      <div className="footer__col">
        <p className="footer__col-title">Product</p>
        <a href="#features"    className="footer__link">Features</a>
        <a href="#how-it-works" className="footer__link">How it works</a>
        <a href="#roles"       className="footer__link">Roles</a>
      </div>

      <div className="footer__col">
        <p className="footer__col-title">Account</p>
        <Link to="/login"  className="footer__link">Sign In</Link>
        <Link to="/signup" className="footer__link">Get Started</Link>
        <Link to="/dashboard" className="footer__link">Dashboard</Link>
      </div>

      <div className="footer__col">
        <p className="footer__col-title">Support</p>
        <a href="#help"    className="footer__link">Help Center</a>
        <a href="#privacy" className="footer__link">Privacy Policy</a>
        <a href="#terms"   className="footer__link">Terms of Service</a>
      </div>
    </div>

    <div className="footer__bottom">
      <div className="container footer__bottom-inner">
        <p>© {new Date().getFullYear()} DukaanSetu. All rights reserved.</p>
        <p>Built with ❤️ for Indian businesses</p>
      </div>
    </div>
  </footer>
);

export default Footer;
