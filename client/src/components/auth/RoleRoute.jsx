import { Navigate } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../../context/AuthContext';

/**
 * RoleRoute — wraps a route that is only accessible to specific roles.
 * If the authenticated user has a different role, redirect them to
 * their own dashboard instead of showing a 403.
 *
 * Usage:
 *   <RoleRoute roles={['shop_owner', 'distributor']}>
 *     <SomePage />
 *   </RoleRoute>
 */
const RoleRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Redirect to the user's own dashboard
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return children;
};

export default RoleRoute;
