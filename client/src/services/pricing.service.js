import api from './api';

export const pricingService = {
  comparePrices: async (productId) => {
    const res = await api.get(`/pricing/compare?productId=${productId}`);
    return res.data;
  },
  getPriceHistory: async (productId) => {
    const res = await api.get(`/pricing/history/${productId}`);
    return res.data;
  },
  addPriceRecord: async (data) => {
    const res = await api.post('/pricing', data);
    return res.data;
  }
};
