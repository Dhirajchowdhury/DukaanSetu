import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

/** Map role slug → dashboard path */
export const ROLE_DASHBOARD = {
  shop_owner:  '/dashboard/shop-owner',
  distributor: '/dashboard/distributor',
  wholesaler:  '/dashboard/wholesaler',
  producer:    '/dashboard/producer',
};

export const ROLE_LABELS = {
  shop_owner:  'Shop Owner',
  distributor: 'Distributor',
  wholesaler:  'Wholesaler',
  producer:    'Producer',
};

/** Returns the correct dashboard path for a user object */
export const getDashboardPath = (user) =>
  ROLE_DASHBOARD[user?.role] ?? '/dashboard/shop-owner';

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  };

  const signup = async (userData) => {
    try {
      const { data } = await api.post('/auth/signup', userData);
      toast.success('Account created! Check your email for the verification code.');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed');
      throw error;
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      const { data } = await api.post('/auth/verify-email', { email, otp });
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      toast.success('Email verified! Welcome to DukaanSetu.');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
      throw error;
    }
  };

  const login = async (credentials) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.shopName}!`);
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    loading,
    signup,
    verifyEmail,
    login,
    logout,
    isAuthenticated: !!user,
    dashboardPath: getDashboardPath(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
