import { Link } from 'react-router-dom';
import { 
  FaArrowRight, 
  FaBarcode, 
  FaBell, 
  FaChartLine, 
  FaMobileAlt,
  FaCheckCircle,
  FaClock,
  FaBox,
  FaShoppingCart,
  FaUsers,
  FaCloud,
  FaLock,
  FaRocket,
  FaTags,
  FaFileAlt
} from 'react-icons/fa';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing">
      <Navbar />
      
      {/* Hero Section with Bento Grid */}
      <section className="hero-bento-section">
        <div className="hero-bento-container">
          
          {/* Header */}
          <div className="hero-header">
            <h1 className="hero-title">
              Inventory Management
              <br />
              <span className="gradient-text">Made Simple</span>
            </h1>
            <p className="hero-subtitle">
              Scan, track, and manage your store inventory with the help of modern technology
            </p>
            <div className="hero-cta">
              <Link to="/signup" className="btn-primary">
                Start Free Trial
                <FaArrowRight />
              </Link>
              <Link to="/login" className="btn-secondary">
                Sign In
              </Link>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="bento-grid">
            
            {/* Large Box - Barcode Scanner */}
            <div className="bento-box bento-large bento-scanner">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaBarcode />
                </div>
                <h3>Instant Barcode Scanning</h3>
                <p>Scan products in seconds with your phone camera</p>
                <div className="scanner-visual">
                  <div className="scanner-line"></div>
                  <div className="barcode-demo">
                    <div className="barcode-line"></div>
                    <div className="barcode-line"></div>
                    <div className="barcode-line short"></div>
                    <div className="barcode-line"></div>
                    <div className="barcode-line short"></div>
                    <div className="barcode-line"></div>
                    <div className="barcode-line"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Box */}
            <div className="bento-box bento-medium bento-stats">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaChartLine />
                </div>
                <h3>Real-Time Analytics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">10K+</div>
                    <div className="stat-label">Products</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">500+</div>
                    <div className="stat-label">Stores</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">99%</div>
                    <div className="stat-label">Accuracy</div>
                  </div>
                </div>
                <div className="mini-chart">
                  <div className="chart-bar" style={{height: '40%'}}></div>
                  <div className="chart-bar" style={{height: '70%'}}></div>
                  <div className="chart-bar" style={{height: '55%'}}></div>
                  <div className="chart-bar" style={{height: '85%'}}></div>
                  <div className="chart-bar" style={{height: '95%'}}></div>
                </div>
              </div>
            </div>

            {/* Notifications Box */}
            <div className="bento-box bento-small bento-notifications">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaBell />
                </div>
                <h3>Smart Alerts</h3>
                <div className="notification-list">
                  <div className="notification-item">
                    <FaClock className="notif-icon" />
                    <span>5 items expiring soon</span>
                  </div>
                  <div className="notification-item">
                    <FaBox className="notif-icon" />
                    <span>Low stock alert</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile App Box */}
            <div className="bento-box bento-small bento-mobile">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaMobileAlt />
                </div>
                <h3>Mobile Ready</h3>
                <p>Works on any device, anywhere</p>
                <div className="mobile-mockup">
                  <div className="phone-frame">
                    <div className="phone-screen">
                      <div className="phone-notch"></div>
                      <div className="phone-content">
                        <div className="phone-bar"></div>
                        <div className="phone-bar short"></div>
                        <div className="phone-bar"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features List Box */}
            <div className="bento-box bento-wide bento-features">
              <div className="bento-content">
                <h3>Everything You Need</h3>
                <div className="features-list">
                  <div className="feature-item">
                    <FaCheckCircle />
                    <span>Expiry date tracking</span>
                  </div>
                  <div className="feature-item">
                    <FaCheckCircle />
                    <span>Category management</span>
                  </div>
                  <div className="feature-item">
                    <FaCheckCircle />
                    <span>Batch tracking</span>
                  </div>
                  <div className="feature-item">
                    <FaCheckCircle />
                    <span>Sales reports</span>
                  </div>
                  <div className="feature-item">
                    <FaCheckCircle />
                    <span>Multi-device sync</span>
                  </div>
                  <div className="feature-item">
                    <FaCheckCircle />
                    <span>Offline mode</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="bento-box bento-medium bento-action">
              <div className="bento-content">
                <div className="bento-icon-badge large">
                  <FaShoppingCart />
                </div>
                <h3>Start Managing Today</h3>
                <p>Join hundreds of store owners who simplified their inventory</p>
                <Link to="/signup" className="btn-bento">
                  Get Started Free
                  <FaArrowRight />
                </Link>
              </div>
            </div>

            {/* Team Collaboration Box */}
            <div className="bento-box bento-small bento-team">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaUsers />
                </div>
                <h3>Team Ready</h3>
                <p>Collaborate with your team in real-time</p>
                <div className="team-avatars">
                  <div className="avatar">👤</div>
                  <div className="avatar">👤</div>
                  <div className="avatar">👤</div>
                  <div className="avatar plus">+5</div>
                </div>
              </div>
            </div>

            {/* Cloud Sync Box */}
            <div className="bento-box bento-small bento-cloud">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaCloud />
                </div>
                <h3>Cloud Sync</h3>
                <p>Auto-sync across all devices</p>
                <div className="sync-indicator">
                  <div className="sync-circle"></div>
                  <div className="sync-circle"></div>
                  <div className="sync-circle"></div>
                </div>
              </div>
            </div>

            {/* Security Box */}
            <div className="bento-box bento-medium bento-security">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaLock />
                </div>
                <h3>Bank-Level Security</h3>
                <p>Your data is encrypted and secure</p>
                <div className="security-badges">
                  <div className="security-badge">🔒 SSL</div>
                  <div className="security-badge">🛡️ Encrypted</div>
                  <div className="security-badge">✅ GDPR</div>
                </div>
              </div>
            </div>

            {/* Performance Box */}
            <div className="bento-box bento-small bento-performance">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaRocket />
                </div>
                <h3>Lightning Fast</h3>
                <p>Optimized for speed</p>
                <div className="speed-meter">
                  <div className="speed-bar"></div>
                  <div className="speed-label">99.9% Uptime</div>
                </div>
              </div>
            </div>

            {/* Categories Box */}
            <div className="bento-box bento-small bento-categories">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaTags />
                </div>
                <h3>Smart Categories</h3>
                <p>Organize with custom tags</p>
                <div className="category-tags">
                  <span className="tag">Groceries</span>
                  <span className="tag">Beverages</span>
                  <span className="tag">Snacks</span>
                </div>
              </div>
            </div>

            {/* Reports Box */}
            <div className="bento-box bento-wide bento-reports">
              <div className="bento-content">
                <div className="bento-icon-badge">
                  <FaFileAlt />
                </div>
                <h3>Detailed Reports & Analytics</h3>
                <p>Export reports in multiple formats</p>
                <div className="report-preview">
                  <div className="report-row">
                    <span>📊 Sales Report</span>
                    <span className="report-status">Ready</span>
                  </div>
                  <div className="report-row">
                    <span>📈 Inventory Analysis</span>
                    <span className="report-status">Ready</span>
                  </div>
                  <div className="report-row">
                    <span>💰 Profit Margins</span>
                    <span className="report-status">Ready</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="social-proof-section" id="features">
        <div className="social-proof-container">
          <p className="social-proof-text">Trusted by store owners across the country</p>
          <div className="trust-badges">
            <div className="trust-badge">⭐ 4.9/5 Rating</div>
            <div className="trust-badge">🔒 Secure & Private</div>
            <div className="trust-badge">📱 PWA Enabled</div>
            <div className="trust-badge">🚀 Always Free Tier</div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="how-container">
          <h2 className="section-title">Get Started in Minutes</h2>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">✨</div>
              <h3>Sign Up</h3>
              <p>Create your free account</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">📱</div>
              <h3>Scan Products</h3>
              <p>Add items with barcode scanner</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">📊</div>
              <h3>Track Inventory</h3>
              <p>Monitor stock in real-time</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon">🔔</div>
              <h3>Get Alerts</h3>
              <p>Never miss important updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="final-cta-container">
          <h2>Ready to Transform Your Inventory?</h2>
          <p>Join hundreds of store owners who trust DukaanSetu</p>
          <div className="final-cta-buttons">
            <Link to="/signup" className="btn-cta-primary">
              Start Free Trial
              <FaArrowRight />
            </Link>
            <Link to="/login" className="btn-cta-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
