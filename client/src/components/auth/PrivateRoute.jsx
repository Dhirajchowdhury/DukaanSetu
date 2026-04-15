import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../../context/AuthContext';

/**
 * PrivateRoute — redirects unauthenticated users to /login.
 * Preserves the attempted URL so we can redirect back after login.
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: 12,
        background: 'var(--bg)',
      }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  return isAuthenticated
    ? children
    : <Navigate to="/login" state={{ from: location }} replace />;
};

export default PrivateRoute;
