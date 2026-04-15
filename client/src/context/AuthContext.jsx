import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  };

  const signup = async (userData) => {
    try {
      const { data } = await api.post('/auth/signup', userData);
      toast.success('Signup successful! Check your email for verification code.');
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
      toast.success('Email verified successfully!');
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
      toast.success('Login successful!');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('accessToken');
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
