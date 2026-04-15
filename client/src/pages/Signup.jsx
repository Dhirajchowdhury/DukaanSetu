import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaGoogle } from 'react-icons/fa';
import './Auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, verifyEmail } = useAuth();
  const [step, setStep] = useState(1); // 1: signup, 2: verify
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    shopName: '',
    phoneNumber: '',
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(formData);
      setStep(2);
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmail(formData.email, otp);
      navigate('/dashboard');
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  };

  if (step === 2) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h2>Verify Your Email</h2>
            <p>Enter the 6-digit code sent to email :- {formData.email}</p>
          </div>

          <form onSubmit={handleVerify} className="auth-form">
            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="123456"
                maxLength="6"
                className="otp-input"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="logo">
            <span className="logo-icon">📦</span>
            <span className="logo-text">DukaanSetu</span>
          </Link>
          <h2>Create Account</h2>
          <p>Start managing your inventory today</p>
        </div>

        <form onSubmit={handleSignup} className="auth-form">
          <div className="form-group">
            <label htmlFor="shopName">Shop Name</label>
            <input
              type="text"
              id="shopName"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              required
              placeholder="My General Store"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              placeholder="+1234567890"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              minLength="6"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button onClick={handleGoogleSignup} className="btn btn-google">
          <FaGoogle /> Continue with Google
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
