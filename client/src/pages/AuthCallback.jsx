import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, ROLE_DASHBOARD } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * Handles the redirect from Google OAuth.
 * URL: /auth/callback?token=<jwt>&role=<role>
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const role  = params.get('role');

    if (!token) {
      toast.error('Authentication failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    // Store token, then fetch user profile
    localStorage.setItem('accessToken', token);

    api.get('/auth/me')
      .then(({ data }) => {
        // Manually set user in context by triggering a page reload
        // (AuthContext.checkAuth runs on mount and will pick up the token)
        const dest = ROLE_DASHBOARD[data.user?.role] ?? ROLE_DASHBOARD.shop_owner;
        toast.success(`Welcome, ${data.user.shopName}!`);
        navigate(dest, { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        toast.error('Authentication failed. Please try again.');
        navigate('/login', { replace: true });
      });
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 16,
      background: 'var(--bg)',
    }}>
      <div className="spinner spinner-lg" />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Completing sign-in…
      </p>
    </div>
  );
};

export default AuthCallback;
