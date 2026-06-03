import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiClock,
  FiPlus, FiChevronRight, FiRepeat,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import OrderDetail from './OrderDetail';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Orders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  // Drawer state
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', flexDirection: 'column', gap: 12 }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading user profile…</p>
      </div>
    );
  }

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', { params: { role: filter } });
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
      toast.success(`Order ${newStatus}`);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  // ── Repeat Order ──────────────────────────────────────────────────────────
  const handleRepeatOrder = (e, order) => {
    e.stopPropagation(); // don't open the detail drawer
    const prefill = {
      supplierId:   order.seller_id,
      supplierName: order.seller?.shop_name || 'Supplier',
      items: (order.items || []).map(item => ({
        productId: item.product_id,
        quantity:  item.quantity,
        oldPrice:  item.price,                           // for diff badge
        productName: item.product?.product_name || 'Product',
      })),
    };
    navigate('/orders/new', { state: { prefill } });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':    return <FiClock className="text-amber-500" />;
      case 'accepted':   return <FiCheckCircle className="text-blue-500" />;
      case 'dispatched': return <FiTruck className="text-indigo-500" />;
      case 'delivered':  return <FiCheckCircle className="text-teal-500" />;
      case 'cancelled':  return <FiXCircle className="text-red-500" />;
      case 'rejected':   return <FiXCircle className="text-red-500" />;
      default:           return null;
    }
  };

  const getStatusBadge = (status) => {
    const base = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit";
    switch (status) {
      case 'pending':    return `${base} bg-amber-50 text-amber-700 border border-amber-100`;
      case 'accepted':   return `${base} bg-blue-50 text-blue-700 border border-blue-100`;
      case 'dispatched': return `${base} bg-indigo-50 text-indigo-700 border border-indigo-100`;
      case 'delivered':  return `${base} bg-teal-50 text-teal-700 border border-teal-100`;
      case 'cancelled':  return `${base} bg-red-50 text-red-700 border border-red-100`;
      case 'rejected':   return `${base} bg-red-50 text-red-700 border border-red-100`;
      default:           return base;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage all your marketplace transactions.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Role tabs */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
            {[['all', 'All'], ['buyer', "I'm Buying"], ['seller', "I'm Selling"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === val ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Place new order CTA */}
          <button
            onClick={() => navigate('/orders/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all hover:shadow-md"
            style={{ whiteSpace: 'nowrap' }}
          >
            <FiPlus size={16} />
            Place Bulk Order
          </button>
        </div>
      </div>

      {/* ── Order list ── */}
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
          <p className="text-gray-500 mb-6">When you place or receive orders, they will appear here.</p>
          <button
            onClick={() => navigate('/orders/new')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
          >
            <FiPlus size={15} />
            Place Your First Order
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isSeller = order.seller_id === user?.id;
            const totalItems = order.items?.length || 0;

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer flex flex-col md:flex-row gap-6 group"
              >
                {/* Left: items preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={getStatusBadge(order.status)}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">
                      #{order.id?.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto md:ml-0">
                      {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Items preview — show up to 2, rest as "+N more" */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {(order.items || []).slice(0, 2).map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FiPackage className="text-base text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">
                            {item.product?.product_name || 'Product'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {item.quantity} {item.product?.unit || 'units'} × {fmt(item.price)}
                            {' = '}
                            <strong className="text-gray-700">{fmt(item.quantity * item.price)}</strong>
                          </p>
                        </div>
                      </div>
                    ))}
                    {totalItems > 2 && (
                      <span className="text-xs text-indigo-500 font-semibold pl-11">
                        +{totalItems - 2} more item{totalItems - 2 > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: total + counterparty */}
                <div className="flex flex-row md:flex-col justify-between items-end md:w-44 text-right gap-2 border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-6 flex-shrink-0">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Grand Total</p>
                    <p className="text-2xl font-black text-gray-900">{fmt(order.total_price)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p className="font-semibold">{isSeller ? 'Buyer' : 'Supplier'}</p>
                    {isSeller ? (
                      <Link to={`/buyer/${order.buyer_id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold truncate max-w-[120px] block hover:underline" onClick={e => e.stopPropagation()}>
                        {order.buyer?.shop_name}
                      </Link>
                    ) : (
                      <p className="text-gray-400 truncate max-w-[120px]">
                        {order.seller?.shop_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Chevron + Repeat Order */}
                <div className="hidden md:flex flex-col items-center gap-2 self-center ml-auto">
                  <button
                    onClick={(e) => handleRepeatOrder(e, order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all whitespace-nowrap"
                    title="Repeat this order"
                  >
                    <FiRepeat size={12} />
                    Repeat
                  </button>
                  <FiChevronRight size={18} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Order Detail Drawer ── */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          currentUserId={user?.id}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  );
};

export default Orders;
