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
      case 'dispatched': return <FiTruck className="text-purple-500" />;
      case 'delivered':  return <FiCheckCircle className="text-green-500" />;
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
      case 'dispatched': return `${base} bg-purple-50 text-purple-700 border border-purple-100`;
      case 'delivered':  return `${base} bg-green-50 text-green-700 border border-green-100`;
      case 'cancelled':  return `${base} bg-red-50 text-red-700 border border-red-100`;
      case 'rejected':   return `${base} bg-red-50 text-red-700 border border-red-100`;
      default:           return base;
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto', minHeight: '100vh', background: '#f9fafb' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#111827', margin: 0 }}>Orders</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
          Track and manage all your marketplace transactions.
        </p>
      </div>

      {/* ── Tab row + CTA ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>

        {/* Segmented tab switcher */}
        <div style={{
          display: 'flex',
          background: '#f3f4f6',
          borderRadius: '10px',
          padding: '4px',
          width: 'fit-content',
          gap: 0,
        }}>
          {[['all', 'All'], ['buyer', "I'm Buying"], ['seller', "I'm Selling"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: filter === val ? 500 : 400,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all .15s ease',
                background:   filter === val ? '#fff' : 'transparent',
                color:        filter === val ? '#111827' : '#6b7280',
                boxShadow:    filter === val ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Place Bulk Order CTA */}
        <button
          onClick={() => navigate('/orders/new')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(79,70,229,.3)',
            transition: 'background .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
          onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
        >
          <FiPlus size={15} />
          Place Bulk Order
        </button>
      </div>

      {/* ── Order list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: '88px', background: '#fff', borderRadius: '14px', border: '1px solid #f3f4f6', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        /* ── FIX 3: polished empty state ── */
        <div style={{
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          borderRadius: '20px',
          border: '1.5px dashed #e5e7eb',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '20px' }}>📦</div>
          <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#111827', margin: '0 0 8px' }}>
            No orders found
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', maxWidth: '340px', lineHeight: 1.6 }}>
            When you place or receive orders, they will appear here.
          </p>
          <button
            onClick={() => navigate('/orders/new')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79,70,229,.25)',
            }}
          >
            <FiPlus size={15} />
            Place Your First Order
          </button>
        </div>
      ) : (
        /* ── FIX 4: order cards ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {orders.map((order) => {
            const isSeller   = order.seller_id === user?.id;
            const totalItems = order.items?.length || 0;

            /* Status pill styles */
            const statusStyles = {
              pending:    { background: '#fffbeb', color: '#b45309' },
              accepted:   { background: '#eff6ff', color: '#1d4ed8' },
              dispatched: { background: '#f5f3ff', color: '#7c3aed' },
              delivered:  { background: '#f0fdf4', color: '#15803d' },
              cancelled:  { background: '#fef2f2', color: '#b91c1c' },
              rejected:   { background: '#fef2f2', color: '#b91c1c' },
            };
            const pillBase = {
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '20px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              ...(statusStyles[order.status] || { background: '#f3f4f6', color: '#374151' }),
            };

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  border: '1px solid #e5e7eb',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  cursor: 'pointer',
                  transition: 'box-shadow .15s, border-color .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.07)'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                {/* Left: order ID + date */}
                <div style={{ minWidth: '120px', flexShrink: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#111827', margin: 0 }}>
                    #{order.id?.slice(0, 8)}
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                    {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Middle: buyer/seller name + item count badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: '14px', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isSeller ? order.buyer?.shop_name : order.seller?.shop_name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{isSeller ? 'Buyer' : 'Supplier'}</span>
                    {totalItems > 0 && (
                      <span style={{ fontSize: '11px', background: '#eff6ff', color: '#3b82f6', borderRadius: '20px', padding: '2px 8px', fontWeight: 600 }}>
                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: total + status */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '16px', color: '#111827', margin: 0 }}>
                    {fmt(order.total_price)}
                  </p>
                  <div style={{ marginTop: '6px' }}>
                    <span style={pillBase}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Repeat + chevron */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={(e) => handleRepeatOrder(e, order)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, color: '#4f46e5', background: '#eff6ff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <FiRepeat size={11} /> Repeat
                  </button>
                  <FiChevronRight size={16} style={{ color: '#d1d5db' }} />
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
