import api from './api';

export const orderService = {
  getOrders: async () => {
    const res = await api.get('/orders');
    return res.data;
  },
  getOrder: async (id) => {
    const res = await api.get(`/orders/${id}`);
    return res.data;
  },
  createOrder: async (data) => {
    const res = await api.post('/orders', data);
    return res.data;
  },
  updateOrderStatus: async (id, status) => {
    const res = await api.put(`/orders/${id}/status`, { status });
    return res.data;
  },
  deleteOrder: async (id) => {
    const res = await api.delete(`/orders/${id}`);
    return res.data;
  },
  repeatOrder: async (id) => {
    const res = await api.post(`/orders/${id}/repeat`);
    return res.data;
  }
};
