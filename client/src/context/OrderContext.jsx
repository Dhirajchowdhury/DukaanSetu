import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { orderService } from '../services/order.service';
import toast from 'react-hot-toast';

const OrderContext = createContext();

export const useOrders = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await orderService.getOrders();
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (id, status) => {
    // Optimistic Update
    const prevOrders = [...orders];
    setOrders(orders.map(o => o._id === id ? { ...o, status } : o));
    
    try {
      await orderService.updateOrderStatus(id, status);
      toast.success(`Order marked as ${status}`);
    } catch (error) {
      setOrders(prevOrders); // Rollback
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const createOrder = async (orderData, navigate) => {
    try {
      const { data } = await orderService.createOrder(orderData);
      setOrders([data, ...orders]);
      toast.success('Order placed successfully!');
      navigate('/orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    }
  };

  const cancelOrder = async (id) => {
    const prevOrders = [...orders];
    setOrders(orders.filter(o => o._id !== id));
    
    try {
      await orderService.deleteOrder(id);
      toast.success('Order cancelled');
    } catch (error) {
      setOrders(prevOrders);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const value = {
    orders,
    loading,
    fetchOrders,
    updateStatus,
    createOrder,
    cancelOrder
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
