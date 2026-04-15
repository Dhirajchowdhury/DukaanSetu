import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const ProductContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  return context;
};

export const ProductProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchProducts = async (filters = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', { params: filters });
      setProducts(data.products);
      return data;
    } catch (error) {
      toast.error('Failed to fetch products');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/products/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const createProduct = async (productData) => {
    try {
      const { data } = await api.post('/products', productData);
      toast.success('Product added successfully!');
      fetchStats();
      return data.product;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add product');
      throw error;
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      const { data } = await api.put(`/products/${id}`, productData);
      toast.success('Product updated successfully!');
      fetchStats();
      return data.product;
    } catch (error) {
      toast.error('Failed to update product');
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully!');
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete product');
      throw error;
    }
  };

  const lookupBarcode = async (barcode) => {
    try {
      const { data } = await api.post('/barcode/lookup', { barcode });
      return data;
    } catch (error) {
      toast.error('Barcode lookup failed');
      throw error;
    }
  };

  const value = {
    products,
    categories,
    stats,
    loading,
    fetchProducts,
    fetchCategories,
    fetchStats,
    createProduct,
    updateProduct,
    deleteProduct,
    lookupBarcode,
  };

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};
