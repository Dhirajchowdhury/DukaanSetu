import { create } from 'zustand';
import api from '../services/api';
import toast from 'react-hot-toast';

const useConnectStore = create((set, get) => ({
  listings:   [],
  myListings: [],
  loading:    false,
  pagination: null,

  fetchListings: async (params = {}) => {
    set({ loading: true });
    try {
      const { data } = await api.get('/connect', { params });
      set({ listings: data.products, pagination: data.pagination, loading: false });
    } catch (err) {
      toast.error('Failed to load marketplace');
      set({ loading: false });
    }
  },

  fetchMyListings: async () => {
    try {
      const { data } = await api.get('/connect/my-listings');
      set({ myListings: data.products });
    } catch {
      // silent
    }
  },

  createListing: async (payload) => {
    try {
      const { data } = await api.post('/connect/my-listings', payload);
      toast.success('Listing created!');
      get().fetchMyListings();
      return data.product;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create listing');
      throw err;
    }
  },

  updateListing: async (id, payload) => {
    try {
      const { data } = await api.put(`/connect/my-listings/${id}`, payload);
      toast.success('Listing updated!');
      get().fetchMyListings();
      return data.product;
    } catch (err) {
      toast.error('Failed to update listing');
      throw err;
    }
  },

  deleteListing: async (id) => {
    try {
      await api.delete(`/connect/my-listings/${id}`);
      toast.success('Listing deleted');
      set(s => ({ myListings: s.myListings.filter(l => l.id !== id) }));
    } catch {
      toast.error('Failed to delete listing');
    }
  },
}));

export default useConnectStore;
