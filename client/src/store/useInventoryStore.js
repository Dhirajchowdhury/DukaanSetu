import { create } from 'zustand';
import api from '../services/api';
import toast from 'react-hot-toast';

const useInventoryStore = create((set, get) => ({
  products:   [],
  categories: [],
  stats:      null,
  loading:    false,
  error:      null,

  fetchProducts: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/products', { params: filters });
      set({ products: data.products, loading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch products';
      set({ error: msg, loading: false });
      toast.error(msg);
      throw err;
    }
  },

  fetchCategories: async () => {
    try {
      const { data } = await api.get('/categories');
      set({ categories: data.categories });
    } catch {
      // silent — categories are non-critical
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await api.get('/products/stats');
      set({ stats: data });
    } catch {
      // silent
    }
  },

  createProduct: async (payload) => {
    try {
      const { data } = await api.post('/products', payload);
      toast.success('Product added!');
      get().fetchStats();
      return data.product;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add product');
      throw err;
    }
  },

  updateProduct: async (id, payload) => {
    try {
      const { data } = await api.put(`/products/${id}`, payload);
      toast.success('Product updated!');
      get().fetchStats();
      return data.product;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update product');
      throw err;
    }
  },

  deleteProduct: async (id) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      set(s => ({ products: s.products.filter(p => p.id !== id) }));
      get().fetchStats();
    } catch (err) {
      toast.error('Failed to delete product');
      throw err;
    }
  },

  adjustStock: async (id, adjustment, reason = '') => {
    try {
      const { data } = await api.patch(`/products/${id}/stock`, { adjustment, reason });
      toast.success(`Stock adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}`);
      get().fetchStats();
      return data.product;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Stock adjustment failed');
      throw err;
    }
  },
}));

export default useInventoryStore;
