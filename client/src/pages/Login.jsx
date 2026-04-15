import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch {
      // toast handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* Left panel */}
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

        {/* Right panel */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <h2>Welcome back</h2>
              <p>Sign in to your DukaanSetu account</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
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
                <label className="form-label">Password</label>
                <div className="auth-input-wrap">
                  <FiLock className="auth-input-icon" />
                  <input
                    className="form-input auth-input"
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowPw(s => !s)}
                  >
                    {showPw ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <div className="divider">or</div>

            <button
              className="btn btn-secondary btn-block"
              onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`}
            >
              <FaGoogle /> Continue with Google
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
