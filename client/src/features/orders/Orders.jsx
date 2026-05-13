import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiClock, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, buyer, seller

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', {
        params: { role: filter }
      });
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':   return <FiClock className="text-amber-500" />;
      case 'accepted':  return <FiCheckCircle className="text-blue-500" />;
      case 'dispatched': return <FiTruck className="text-indigo-500" />;
      case 'delivered': return <FiCheckCircle className="text-teal-500" />;
      case 'cancelled': return <FiXCircle className="text-red-500" />;
      default:          return null;
    }
  };

  const getStatusBadge = (status) => {
    const base = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit";
    switch (status) {
      case 'pending':   return `${base} bg-amber-50 text-amber-700 border border-amber-100`;
      case 'accepted':  return `${base} bg-blue-50 text-blue-700 border border-blue-100`;
      case 'dispatched': return `${base} bg-indigo-50 text-indigo-700 border border-indigo-100`;
      case 'delivered': return `${base} bg-teal-50 text-teal-700 border border-teal-100`;
      case 'cancelled': return `${base} bg-red-50 text-red-700 border border-red-100`;
      default:          return base;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Orders Management</h1>
          <p className="text-gray-500 mt-1">Track and manage your marketplace transactions.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('buyer')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'buyer' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            I'm Buying
          </button>
          <button 
            onClick={() => setFilter('seller')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'seller' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            I'm Selling
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100 shadow-sm" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-gray-800">No orders found</h3>
          <p className="text-gray-500">When you place or receive orders, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isSeller = order.seller_id === user.id;
            return (
              <div key={order.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={getStatusBadge(order.status)}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">
                      ID: #{order.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto md:ml-0">
                      {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FiPackage className="text-2xl text-teal-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{order.wholesaler_products?.product_name || 'Product'}</h4>
                      <p className="text-sm text-gray-500">
                        {order.quantity} {order.wholesaler_products?.unit || 'units'} × ₹{order.wholesaler_products?.price_per_unit}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-between items-end md:w-48 text-right gap-2 border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Price</p>
                    <p className="text-2xl font-black text-gray-900">₹{order.total_price}</p>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <p className="font-semibold">{isSeller ? 'Buyer' : 'Seller'}</p>
                    <p className="text-gray-400">{isSeller ? order.buyer?.shop_name : order.seller?.shop_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:flex-col md:justify-center">
                  {/* Seller Actions */}
                  {isSeller && order.status === 'pending' && (
                    <button 
                      onClick={() => updateStatus(order.id, 'accepted')}
                      className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
                    >
                      Accept
                    </button>
                  )}
                  {isSeller && order.status === 'accepted' && (
                    <button 
                      onClick={() => updateStatus(order.id, 'dispatched')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Dispatch
                    </button>
                  )}
                  {isSeller && order.status === 'dispatched' && (
                    <button 
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
                    >
                      Complete
                    </button>
                  )}

                  {/* Buyer/Seller Cancel */}
                  {(order.status === 'pending' || (isSeller && order.status === 'accepted')) && (
                    <button 
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
