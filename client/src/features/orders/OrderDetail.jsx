import React, { useState } from 'react';
import {
  FiX, FiPackage, FiCheckCircle, FiXCircle, FiClock,
  FiTruck, FiMapPin, FiFileText, FiUser, FiCalendar,
} from 'react-icons/fi';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

const STATUS_META = {
  pending:    { label: 'Pending',    icon: <FiClock />,        color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  accepted:   { label: 'Accepted',   icon: <FiCheckCircle />,  color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  dispatched: { label: 'Dispatched', icon: <FiTruck />,        color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff' },
  delivered:  { label: 'Delivered',  icon: <FiCheckCircle />,  color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  cancelled:  { label: 'Cancelled',  icon: <FiXCircle />,      color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  rejected:   { label: 'Rejected',   icon: <FiXCircle />,      color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
};

const TIMELINE = ['pending', 'accepted', 'dispatched', 'delivered'];

// ── component ────────────────────────────────────────────────────────────────

const OrderDetail = ({ order, currentUserId, onClose, onUpdateStatus }) => {
  const [confirmAction, setConfirmAction] = useState(null);

  if (!order) return null;

  const isSeller = order.seller_id === currentUserId;
  const meta     = STATUS_META[order.status] || STATUS_META.pending;
  const timelineIdx = TIMELINE.indexOf(order.status);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.35)',
          backdropFilter: 'blur(3px)',
          zIndex: 200,
          animation: 'fadeIn .15s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 520,
        background: '#fff',
        boxShadow: '-8px 0 40px rgba(0,0,0,.14)',
        zIndex: 201,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .22s ease',
        overflowY: 'auto',
      }}>

        {/* ── Drawer header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Order Details
            </h2>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>
              #{order.id?.slice(0, 16)}…
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#f9fafb', border: '1.5px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#6b7280', transition: 'all .18s',
            }}
          >
            <FiX size={16} />
          </button>
        </div>

        {/* ── Status badge ── */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            background: meta.bg, border: `1.5px solid ${meta.border}`,
            borderRadius: 12, color: meta.color,
            fontSize: 13, fontWeight: 700,
          }}>
            {meta.icon}
            {meta.label}
          </div>
        </div>

        {/* ── Timeline (Vertical Stepper) ── */}
        {order.status !== 'cancelled' && order.status !== 'rejected' && (
          <div style={{ padding: '20px 24px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {TIMELINE.map((step, i) => {
                const done    = i <= timelineIdx;
                const current = i === timelineIdx;
                const stepMeta = STATUS_META[step];
                return (
                  <React.Fragment key={step}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: done ? stepMeta.color : '#e5e7eb',
                        color: done ? '#fff' : '#9ca3af',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12,
                        boxShadow: current ? `0 0 0 4px ${stepMeta.bg}` : 'none',
                        transition: 'all .3s',
                      }}>
                        {done ? <FiCheckCircle size={13} /> : <span style={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</span>}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: done ? stepMeta.color : '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                        {stepMeta.label}
                      </span>
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div style={{
                        width: 2, height: 24, margin: '4px 0 4px 13px',
                        background: i < timelineIdx ? '#4f46e5' : '#e5e7eb',
                        transition: 'background .3s',
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Itemized table ── */}
        <div style={{ padding: '24px 24px 0' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            Items Ordered
          </h3>
          <div style={{ border: '1.5px solid #f1f5f9', borderRadius: 14, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px',
              gap: 8, padding: '10px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
            }}>
              {['Product', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: h !== 'Product' ? 'right' : 'left' }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {(order.items || []).map((item, idx) => {
              const subtotal = (item.quantity || 0) * (item.price || 0);
              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px',
                    gap: 8, padding: '13px 16px', alignItems: 'center',
                    borderBottom: idx < (order.items.length - 1) ? '1px solid #f8fafc' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <FiPackage size={14} style={{ color: '#4f46e5' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {item.product?.product_name || 'Product'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {item.product?.category || ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'right' }}>
                    {item.quantity} <span style={{ fontSize: 10, color: '#94a3b8' }}>{item.product?.unit || 'u'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', textAlign: 'right' }}>{fmt(item.price)}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5', textAlign: 'right' }}>{fmt(subtotal)}</div>
                </div>
              );
            })}

            {/* Grand total row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px',
              background: '#fafbff',
              borderTop: '2px solid #e5e7eb',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                Grand Total ({order.items?.length || 0} items)
              </span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#4f46e5' }}>
                {fmt(order.total_price)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Meta info ── */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Buyer / Seller */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
              <FiUser size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  {isSeller ? 'Buyer' : 'Seller'}
                </span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {isSeller ? order.buyer?.shop_name : order.seller?.shop_name}
                </div>
              </div>
            </div>

            {/* Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
              <FiCalendar size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Placed On</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            </div>

            {/* Delivery location */}
            {order.delivery_location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
                <FiMapPin size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Delivery To</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{order.delivery_location}</div>
                </div>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
                <FiFileText size={14} style={{ color: '#6b7280', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Notes</span>
                  <div style={{ fontSize: 13, color: '#374151' }}>{order.notes}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ padding: '24px', marginTop: 'auto' }}>
          {confirmAction ? (
            <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>
                Are you sure you want to {confirmAction.label.toLowerCase()}?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    onUpdateStatus(order.id, confirmAction.status);
                    setConfirmAction(null);
                  }}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 8,
                    background: '#f59e0b', color: '#fff', border: 'none',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Yes, confirm
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 8,
                    background: '#fff', color: '#92400e', border: '1px solid #fcd34d',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {isSeller && order.status === 'pending' && (
                <>
                  <button
                    onClick={() => setConfirmAction({ status: 'accepted', label: 'Accept Order' })}
                    style={{
                      flex: 1, padding: '12px 20px', borderRadius: 12,
                      background: '#4f46e5', color: '#fff', border: 'none',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      transition: 'all .18s',
                    }}
                  >
                    ✅ Accept Order
                  </button>
                  <button
                    onClick={() => setConfirmAction({ status: 'rejected', label: 'Reject Order' })}
                    style={{
                      flex: '0 0 auto', padding: '12px 20px', borderRadius: 12,
                      background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fca5a5',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      transition: 'all .18s',
                    }}
                  >
                    Reject
                  </button>
                </>
              )}
              {isSeller && order.status === 'accepted' && (
                <button
                  onClick={() => setConfirmAction({ status: 'dispatched', label: 'Mark as Dispatched' })}
                  style={{
                    flex: 1, padding: '12px 20px', borderRadius: 12,
                    background: '#6366f1', color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  🚚 Mark as Dispatched
                </button>
              )}
              {isSeller && order.status === 'dispatched' && (
                <button
                  onClick={() => setConfirmAction({ status: 'delivered', label: 'Mark as Delivered' })}
                  style={{
                    flex: 1, padding: '12px 20px', borderRadius: 12,
                    background: '#10b981', color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  📦 Mark as Delivered
                </button>
              )}
              {order.status === 'pending' && (
                <button
                  onClick={() => setConfirmAction({ status: 'cancelled', label: 'Cancel Order' })}
                  style={{
                    flex: !isSeller ? 1 : '0 0 auto',
                    padding: '12px 20px', borderRadius: 12,
                    background: '#f9fafb', color: '#6b7280', border: '1.5px solid #e5e7eb',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Cancel Order
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default OrderDetail;
