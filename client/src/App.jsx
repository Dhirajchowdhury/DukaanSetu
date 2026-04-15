import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PrivateRoute from './components/auth/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#FFFFF0',
                color: '#2D3748',
                borderRadius: '8px',
              },
              success: {
                iconTheme: {
                  primary: '#8AA624',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#DC2626',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/products" element={
              <PrivateRoute>
                <Products />
              </PrivateRoute>
            } />
            <Route path="/categories" element={
              <PrivateRoute>
                <Categories />
              </PrivateRoute>
            } />
            <Route path="/reports" element={
              <PrivateRoute>
                <Reports />
              </PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ProductProvider>
    </AuthProvider>
  );
}

export default App;
