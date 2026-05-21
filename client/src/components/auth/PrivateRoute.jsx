import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../../context/AuthContext';

/**
 * PrivateRoute — redirects unauthenticated users to /login.
 * Also redirects incomplete profiles to /onboarding, and guards
 * the onboarding page from complete profiles.
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force onboarding if profile is incomplete
  if (user && user.isProfileComplete === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect to dashboard if profile is complete and trying to hit onboarding
  if (user && user.isProfileComplete === true && location.pathname === '/onboarding') {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return children;
};

export default PrivateRoute;
