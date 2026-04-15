import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';

// Auth
import PrivateRoute  from './components/auth/PrivateRoute';
import RoleRoute     from './components/auth/RoleRoute';

// Pages
import Landing       from './pages/Landing';
import Login         from './pages/Login';
import Signup        from './pages/Signup';
import AuthCallback  from './pages/AuthCallback';
import Products      from './pages/Products';
import Categories    from './pages/Categories';
import Reports       from './pages/Reports';
import Settings      from './pages/Settings';

// Role dashboards
import ShopOwnerDashboard   from './pages/dashboards/ShopOwnerDashboard';
import DistributorDashboard from './pages/dashboards/DistributorDashboard';
import WholesalerDashboard  from './pages/dashboards/WholesalerDashboard';
import ProducerDashboard    from './pages/dashboards/ProducerDashboard';

// Legacy /dashboard → redirect to role-specific path
import { useAuth, getDashboardPath } from './context/AuthContext';

/** Redirects /dashboard → /dashboard/<role> */
const DashboardRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPath(user)} replace />;
};

function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#fff',
                color: '#0F172A',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,.1)',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />

          <Routes>
            {/* Public */}
            <Route path="/"             element={<Landing />} />
            <Route path="/login"        element={<Login />} />
            <Route path="/signup"       element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Legacy redirect */}
            <Route path="/dashboard" element={
              <PrivateRoute><DashboardRedirect /></PrivateRoute>
            } />

            {/* ── Role-specific dashboards ── */}
            <Route path="/dashboard/shop-owner" element={
              <PrivateRoute>
                <RoleRoute roles={['shop_owner']}>
                  <ShopOwnerDashboard />
                </RoleRoute>
              </PrivateRoute>
            } />

            <Route path="/dashboard/distributor" element={
              <PrivateRoute>
                <RoleRoute roles={['distributor']}>
                  <DistributorDashboard />
                </RoleRoute>
              </PrivateRoute>
            } />

            <Route path="/dashboard/wholesaler" element={
              <PrivateRoute>
                <RoleRoute roles={['wholesaler']}>
                  <WholesalerDashboard />
                </RoleRoute>
              </PrivateRoute>
            } />

            <Route path="/dashboard/producer" element={
              <PrivateRoute>
                <RoleRoute roles={['producer']}>
                  <ProducerDashboard />
                </RoleRoute>
              </PrivateRoute>
            } />

            {/* ── Common protected pages (all roles) ── */}
            <Route path="/products" element={
              <PrivateRoute><Products /></PrivateRoute>
            } />
            <Route path="/categories" element={
              <PrivateRoute><Categories /></PrivateRoute>
            } />
            <Route path="/reports" element={
              <PrivateRoute><Reports /></PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute><Settings /></PrivateRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ProductProvider>
    </AuthProvider>
  );
}

export default App;
