import { create } from 'zustand';
import api from '../services/api';
import toast from 'react-hot-toast';

const useOrdersStore = create((set) => ({
  orders:     [],
  loading:    false,
  pagination: null,

  fetchOrders: async (params = {}) => {
    set({ loading: true });
    try {
      const { data } = await api.get('/orders', { params });
      set({ orders: data.orders, pagination: data.pagination, loading: false });
    } catch {
      toast.error('Failed to load orders');
      set({ loading: false });
    }
  },

  placeOrder: async (payload) => {
    try {
      const { data } = await api.post('/orders', payload);
      toast.success('Order placed successfully!');
      return data.order;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
      throw err;
    }
  },

  updateStatus: async (id, status) => {
    try {
      const { data } = await api.put(`/orders/${id}`, { status });
      toast.success(`Order ${status}`);
      set(s => ({
        orders: s.orders.map(o => o.id === id ? data.order : o),
      }));
      return data.order;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order');
      throw err;
    }
  },
}));

export default useOrdersStore;
