import api from './api';

export const supplierService = {
  getSuppliers: async () => {
    const res = await api.get('/suppliers');
    return res.data;
  },
  getSupplier: async (id) => {
    const res = await api.get(`/suppliers/${id}`);
    return res.data;
  },
  createSupplier: async (data) => {
    const res = await api.post('/suppliers', data);
    return res.data;
  },
  getNearbySuppliers: async (lng, lat, distance) => {
    const res = await api.get(`/suppliers/nearby?lng=${lng}&lat=${lat}&distance=${distance}`);
    return res.data;
  }
};
