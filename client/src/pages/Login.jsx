import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import './Auth.css';

const Login = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  // Redirect back to the page the user tried to visit, or their dashboard
  const from = location.state?.from?.pathname;

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (fieldError) setFieldError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setFieldError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await login(form);
      // Redirect to attempted page OR role dashboard
      navigate(from || getDashboardPath(user), { replace: true });
    } catch (err) {
      setFieldError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* ── Brand panel ── */}
        <div className="auth-brand">
          <div className="auth-brand__inner">
            <div className="auth-brand__logo">📦</div>
            <h1 className="auth-brand__name">DukaanSetu</h1>
            <p className="auth-brand__tagline">
              Smart Inventory Management for Modern Businesses
            </p>
            <div className="auth-brand__features">
              {[
                'Real-time stock tracking',
                'Low stock alerts',
                'Expiry date monitoring',
                'Multi-role access',
              ].map(f => (
                <div key={f} className="auth-brand__feature">
                  <span className="auth-brand__feature-dot" />
                  {f}
                </div>
              ))}
            </div>
            {/* Role badges */}
            <div className="auth-brand__roles">
              {['🏪 Shop Owner','🚚 Distributor','🏭 Wholesaler','🌾 Producer'].map(r => (
                <span key={r} className="auth-brand__role-badge">{r}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <h2>Welcome back</h2>
              <p>Sign in to your DukaanSetu account</p>
            </div>

            {/* Inline error banner */}
            {fieldError && (
              <div className="auth-error-banner">
                <FiAlertCircle />
                <span>{fieldError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="auth-input-wrap">
                  <FiMail className="auth-input-icon" />
                  <input
                    className={`form-input auth-input ${fieldError ? 'form-input--error' : ''}`}
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="auth-input-wrap">
                  <FiLock className="auth-input-icon" />
                  <input
                    className={`form-input auth-input ${fieldError ? 'form-input--error' : ''}`}
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowPw(s => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner" /> Signing in…</>
                  : 'Sign In'
                }
              </button>
            </form>

            <div className="divider">or</div>

            <button
              className="btn btn-secondary btn-block auth-google-btn"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading
                ? <><span className="spinner" /> Redirecting…</>
                : <><FaGoogle className="auth-google-icon" /> Continue with Google</>
              }
            </button>

            <p className="auth-footer-text">
              Don't have an account? <Link to="/signup">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
