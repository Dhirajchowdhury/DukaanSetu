import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../context/AuthContext';
import { FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import { API_URL } from '../config/api';
import './Auth.css';

const ROLES = [
  { value: 'shop_owner',  label: '🏪 Shop Owner' },
  { value: 'distributor', label: '🚚 Distributor' },
  { value: 'wholesaler',  label: '🏭 Wholesaler' },
  { value: 'producer',    label: '🌾 Producer' },
];

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({
    email: '', password: '', shop_name: '', phone_number: '', role: 'shop_owner',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await signup(form);
      navigate(getDashboardPath(user), { replace: true });
    } catch {
      // toast handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-brand">
          <div className="auth-brand__inner">
            <div className="auth-brand__logo">📦</div>
            <h1 className="auth-brand__name">DukaanSetu</h1>
            <p className="auth-brand__tagline">Smart Inventory Management for Modern Businesses</p>
            <div className="auth-brand__features">
              {['Real-time stock tracking', 'Low stock alerts', 'Expiry date monitoring', 'Multi-role access'].map(f => (
                <div key={f} className="auth-brand__feature">
                  <span className="auth-brand__feature-dot" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <h2>Create account</h2>
              <p>Start managing your inventory for free</p>
            </div>

            <form onSubmit={handleSignup} className="auth-form">
              {/* Role selector */}
              <div className="form-group">
                <label className="form-label">I am a...</label>
                <div className="auth-role-grid">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      className={`auth-role-btn ${form.role === r.value ? 'auth-role-btn--active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Shop / Business Name</label>
                <div className="auth-input-wrap">
                  <FiUser className="auth-input-icon" />
                  <input
                    className="form-input auth-input"
                    name="shop_name"
                    value={form.shop_name}
                    onChange={handleChange}
                    placeholder="My General Store"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="auth-input-wrap">
                  <FiMail className="auth-input-icon" />
                  <input
                    className="form-input auth-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="auth-input-wrap">
                  <FiPhone className="auth-input-icon" />
                  <input
                    className="form-input auth-input"
                    type="tel"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="auth-input-wrap">
                  <FiLock className="auth-input-icon" />
                  <input
                    className="form-input auth-input"
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    minLength="6"
                    required
                  />
                  <button type="button" className="auth-input-toggle" onClick={() => setShowPw(s => !s)}>
                    {showPw ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
              </button>
            </form>

            <div className="divider">or</div>

            <button
              className="btn btn-secondary btn-block"
              onClick={() => window.location.href = `${API_URL}/api/auth/google`}
            >
              <FaGoogle /> Continue with Google
            </button>

            <p className="auth-footer-text">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
