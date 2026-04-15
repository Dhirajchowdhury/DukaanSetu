import { Link } from 'react-router-dom';
import {
  FiArrowRight, FiPackage, FiBell, FiBarChart2,
  FiTag, FiShield, FiZap, FiUsers, FiCheck,
} from 'react-icons/fi';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import './Landing.css';

/* ── Data ─────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <FiPackage />,
    title: 'Real-time Stock Tracking',
    desc: 'Monitor every product in your inventory live. Know exactly what you have, where it is, and when it runs low.',
    color: 'blue',
  },
  {
    icon: <FiBell />,
    title: 'Smart Low-Stock Alerts',
    desc: 'Get notified via email or SMS the moment stock dips below your threshold — before you run out.',
    color: 'amber',
  },
  {
    icon: <FiUsers />,
    title: 'Multi-Role Access',
    desc: 'Shop owners, distributors, wholesalers, and producers each get a tailored view and permissions.',
    color: 'green',
  },
  {
    icon: <FiTag />,
    title: 'Category Management',
    desc: 'Organise products with custom categories and emoji icons. Filter and find anything in seconds.',
    color: 'purple',
  },
  {
    icon: <FiBarChart2 />,
    title: 'Inventory Analytics',
    desc: 'Visual reports on stock value, category breakdown, expiry timelines, and more.',
    color: 'blue',
  },
  {
    icon: <FiShield />,
    title: 'Secure & Reliable',
    desc: 'JWT authentication, bcrypt password hashing, and role-based access control keep your data safe.',
    color: 'green',
  },
];

const STEPS = [
  {
    num: '01',
    icon: '✨',
    title: 'Create your account',
    desc: 'Sign up in under a minute. Choose your role — shop owner, distributor, wholesaler, or producer.',
  },
  {
    num: '02',
    icon: '📦',
    title: 'Add your products',
    desc: 'Add products manually or scan barcodes. Set categories, prices, expiry dates, and stock thresholds.',
  },
  {
    num: '03',
    icon: '📊',
    title: 'Track & get alerted',
    desc: 'Watch your dashboard update in real-time. Receive alerts before stock runs out or products expire.',
  },
];

const ROLES = [
  {
    emoji: '🏪',
    title: 'Shop Owner',
    desc: 'Full inventory control — add products, track stock, view reports, and manage categories.',
    tags: ['Full CRUD', 'Reports', 'Alerts'],
  },
  {
    emoji: '🚚',
    title: 'Distributor',
    desc: 'Manage distribution inventory, track outgoing stock, and coordinate with suppliers.',
    tags: ['Stock tracking', 'Supplier view'],
  },
  {
    emoji: '🏭',
    title: 'Wholesaler',
    desc: 'Bulk inventory management with category-level insights and value calculations.',
    tags: ['Bulk view', 'Value calc'],
  },
  {
    emoji: '🌾',
    title: 'Producer',
    desc: 'Track raw materials and finished goods with batch numbers and expiry monitoring.',
    tags: ['Batch tracking', 'Expiry alerts'],
  },
];

const STATS = [
  { value: '10K+', label: 'Products tracked' },
  { value: '500+', label: 'Businesses onboarded' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'User rating' },
];

/* ── Component ────────────────────────────────────── */

const Landing = () => (
  <div className="landing">
    <Navbar />

    {/* ── HERO ── */}
    <section className="hero">
      <div className="hero__bg-grid" aria-hidden="true" />
      <div className="hero__blob hero__blob--1" aria-hidden="true" />
      <div className="hero__blob hero__blob--2" aria-hidden="true" />

      <div className="container hero__inner">
        <div className="hero__badge">
          <FiZap /> Smart Inventory for Modern Businesses
        </div>

        <h1 className="hero__title">
          Manage Your Inventory
          <br />
          <span className="hero__title-accent">Without the Chaos</span>
        </h1>

        <p className="hero__sub">
          DukaanSetu gives shop owners, distributors, wholesalers, and producers
          a single dashboard to track stock, catch low-inventory early, and
          never let products expire unnoticed.
        </p>

        <div className="hero__cta">
          <Link to="/signup" className="btn btn-primary btn-lg hero__cta-primary">
            Get Started Free <FiArrowRight />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            Sign In
          </Link>
        </div>

        <div className="hero__trust">
          {['No credit card required', 'Free tier available', 'Setup in 2 minutes'].map(t => (
            <span key={t} className="hero__trust-item">
              <FiCheck /> {t}
            </span>
          ))}
        </div>
      </div>

      {/* Dashboard preview card */}
      <div className="container hero__preview-wrap">
        <div className="hero__preview">
          <div className="preview__bar">
            <span className="preview__dot preview__dot--red" />
            <span className="preview__dot preview__dot--yellow" />
            <span className="preview__dot preview__dot--green" />
            <span className="preview__bar-title">DukaanSetu Dashboard</span>
          </div>
          <div className="preview__body">
            <div className="preview__stats">
              {[
                { label: 'Total Products', val: '248', color: 'blue' },
                { label: 'Low Stock', val: '12', color: 'amber' },
                { label: 'Expiring Soon', val: '5', color: 'red' },
                { label: 'Inventory Value', val: '₹1.2L', color: 'green' },
              ].map(s => (
                <div key={s.label} className={`preview__stat preview__stat--${s.color}`}>
                  <span className="preview__stat-val">{s.val}</span>
                  <span className="preview__stat-label">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="preview__table">
              <div className="preview__table-head">
                <span>Product</span><span>Category</span><span>Qty</span><span>Status</span>
              </div>
              {[
                { name: 'Basmati Rice 5kg', cat: '🌾 Grains', qty: '42', status: 'ok' },
                { name: 'Tata Salt 1kg', cat: '🧂 Spices', qty: '8', status: 'low' },
                { name: 'Amul Butter 500g', cat: '🥛 Dairy', qty: '0', status: 'out' },
                { name: 'Maggi Noodles', cat: '🍜 Snacks', qty: '31', status: 'ok' },
              ].map(r => (
                <div key={r.name} className="preview__table-row">
                  <span className="preview__product-name">{r.name}</span>
                  <span className="preview__cat">{r.cat}</span>
                  <span className="preview__qty">{r.qty}</span>
                  <span className={`preview__status preview__status--${r.status}`}>
                    {r.status === 'ok' ? 'In Stock' : r.status === 'low' ? 'Low Stock' : 'Out of Stock'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── STATS STRIP ── */}
    <section className="stats-strip">
      <div className="container stats-strip__inner">
        {STATS.map(s => (
          <div key={s.label} className="stats-strip__item">
            <span className="stats-strip__val">{s.value}</span>
            <span className="stats-strip__label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>

    {/* ── FEATURES ── */}
    <section className="features" id="features">
      <div className="container">
        <div className="section-header">
          <p className="section-eyebrow">Features</p>
          <h2 className="section-title">Everything you need to run a tight inventory</h2>
          <p className="section-sub">
            Built specifically for Indian retail — from kirana stores to large distributors.
          </p>
        </div>

        <div className="features__grid">
          {FEATURES.map(f => (
            <div key={f.title} className={`feature-card feature-card--${f.color}`}>
              <div className="feature-card__icon">{f.icon}</div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── HOW IT WORKS ── */}
    <section className="how" id="how-it-works">
      <div className="container">
        <div className="section-header">
          <p className="section-eyebrow">How it works</p>
          <h2 className="section-title">Up and running in minutes</h2>
        </div>

        <div className="how__steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className="how__step">
              <div className="how__step-num">{s.num}</div>
              {i < STEPS.length - 1 && <div className="how__connector" aria-hidden="true" />}
              <div className="how__step-icon">{s.icon}</div>
              <h3 className="how__step-title">{s.title}</h3>
              <p className="how__step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── ROLE SHOWCASE ── */}
    <section className="roles" id="roles">
      <div className="container">
        <div className="section-header">
          <p className="section-eyebrow">Multi-role system</p>
          <h2 className="section-title">Built for every player in the supply chain</h2>
          <p className="section-sub">
            One platform, four roles — each with a tailored experience.
          </p>
        </div>

        <div className="roles__grid">
          {ROLES.map(r => (
            <div key={r.title} className="role-card">
              <div className="role-card__emoji">{r.emoji}</div>
              <h3 className="role-card__title">{r.title}</h3>
              <p className="role-card__desc">{r.desc}</p>
              <div className="role-card__tags">
                {r.tags.map(t => (
                  <span key={t} className="badge badge-primary">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── FINAL CTA ── */}
    <section className="cta-section">
      <div className="container cta-section__inner">
        <div className="cta-section__blob" aria-hidden="true" />
        <p className="section-eyebrow cta-section__eyebrow">Ready to start?</p>
        <h2 className="cta-section__title">
          Take control of your inventory today
        </h2>
        <p className="cta-section__sub">
          Join hundreds of businesses already using DukaanSetu to reduce waste,
          prevent stockouts, and grow smarter.
        </p>
        <div className="cta-section__btns">
          <Link to="/signup" className="btn btn-primary btn-lg">
            Create Free Account <FiArrowRight />
          </Link>
          <Link to="/login" className="btn cta-section__login-btn btn-lg">
            Sign In
          </Link>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Landing;
