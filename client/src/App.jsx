import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';

// Auth
import PrivateRoute from './components/auth/PrivateRoute';
import RoleRoute from './components/auth/RoleRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Connect from './pages/Connect';
import Connections from './pages/Connections';
import Orders from './pages/Orders';
import BulkOrderPage from './pages/BulkOrderPage';
import ReorderPage   from './pages/ReorderPage';
import Onboarding from './pages/Onboarding';
import ActivityLogPage from './pages/ActivityLogPage';
import StockHistoryPage from './pages/StockHistoryPage';
import ProductRankingPage from './pages/ProductRankingPage';
import PendingDuesPage from './pages/PendingDuesPage';
import BuyerProfilePage from './pages/BuyerProfilePage';
import ExpensesPage from './pages/ExpensesPage';
import FinancePage from './pages/FinancePage';
import CustomersPage from './pages/CustomersPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import FeedbackPage from './pages/FeedbackPage';
import DiscountsPage from './pages/DiscountsPage';

// Role dashboards
import ShopOwnerDashboard from './pages/dashboards/ShopOwnerDashboard';
import DistributorDashboard from './pages/dashboards/DistributorDashboard';
import WholesalerDashboard from './pages/dashboards/WholesalerDashboard';
import ProducerDashboard from './pages/dashboards/ProducerDashboard';
import { InventoryLayout } from './features/inventory/components/InventoryLayout';

// Legacy /dashboard → redirect to role-specific path
import { useAuth, getDashboardPath } from './context/AuthContext';
import './i18n';
import useOnlineSync from './hooks/useOnlineSync';

/** Redirects /dashboard → /dashboard/<role> */
const DashboardRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPath(user)} replace />;
};

function AppInner() {
  useOnlineSync();
  return null;
}

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
              error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />

          <AppInner />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
              <PrivateRoute><InventoryLayout /></PrivateRoute>
            } />
            <Route path="/inventory" element={
              <PrivateRoute><InventoryLayout /></PrivateRoute>
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
            <Route path="/connect" element={
              <PrivateRoute><Connect /></PrivateRoute>
            } />
            <Route path="/connect/profile/:id" element={
              <PrivateRoute><Connect /></PrivateRoute>
            } />
            <Route path="/profile/:id" element={
              <PrivateRoute><Connect /></PrivateRoute>
            } />
            <Route path="/connections" element={
              <PrivateRoute><Connections /></PrivateRoute>
            } />
            <Route path="/orders/new" element={
              <PrivateRoute><BulkOrderPage /></PrivateRoute>
            } />
            <Route path="/reorder-rules" element={
              <PrivateRoute><ReorderPage /></PrivateRoute>
            } />
            <Route path="/orders" element={
              <PrivateRoute><Orders /></PrivateRoute>
            } />
            <Route path="/onboarding" element={
              <PrivateRoute><Onboarding /></PrivateRoute>
            } />

            {/* New feature pages */}
            <Route path="/activity" element={
              <PrivateRoute><ActivityLogPage /></PrivateRoute>
            } />
            <Route path="/inventory/history" element={
              <PrivateRoute><StockHistoryPage /></PrivateRoute>
            } />
            <Route path="/product-ranking" element={
              <PrivateRoute><ProductRankingPage /></PrivateRoute>
            } />
            <Route path="/dues" element={
              <PrivateRoute><PendingDuesPage /></PrivateRoute>
            } />
            <Route path="/buyer/:id" element={
              <PrivateRoute><BuyerProfilePage /></PrivateRoute>
            } />
            <Route path="/expenses" element={
              <PrivateRoute><ExpensesPage /></PrivateRoute>
            } />
            <Route path="/finance" element={
              <PrivateRoute><FinancePage /></PrivateRoute>
            } />
            <Route path="/customers" element={
              <PrivateRoute><CustomersPage /></PrivateRoute>
            } />
            <Route path="/subscriptions" element={
              <PrivateRoute><SubscriptionsPage /></PrivateRoute>
            } />
            <Route path="/feedback" element={
              <PrivateRoute><FeedbackPage /></PrivateRoute>
            } />
            <Route path="/discounts" element={
              <PrivateRoute><DiscountsPage /></PrivateRoute>
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
