import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiAward, FiUser, FiPhone, FiMail, FiMapPin, FiShoppingBag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ── shared tokens ── */
const PURPLE_BG   = '#ede9fe';
const PURPLE_TEXT = '#6d28d9';
const PURPLE_DARK = '#5b21b6';
const BORDER      = '#e5e7eb';
const MUTED       = '#9ca3af';
const TEXT        = '#111827';
const TEXT_SUB    = '#6b7280';

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers,      setCustomers]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [showModal,      setShowModal]      = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  /* ── unchanged data logic ── */
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: '50' });
      const res = await fetch(`${API}/customers?${params}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status >= 500) toast.error('Server error loading customers.');
        setCustomers([]);
        return;
      }
      const data = await res.json();
      setCustomers(data.customers || []);
      setActiveCustomer(prev => {
        if (!prev && data.customers?.length > 0) return data.customers[0];
        return prev;
      });
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url    = editing ? `${API}/customers/${editing.id}` : `${API}/customers`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      toast.success(editing ? 'Customer updated' : 'Customer created');
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
      fetchCustomers();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try {
      const res = await fetch(`${API}/customers/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Customer deleted');
      if (activeCustomer?.id === id) setActiveCustomer(null);
      fetchCustomers();
    } catch (err) { toast.error(err.message); }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    setShowModal(true);
  };

  const initials = (name) => name?.charAt(0).toUpperCase() || '?';

  return (
    <div className="dashboard-layout">
      <Sidebar />

      {/* ── Overall layout: column, full height ── */}
      <main style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: '#f9fafb' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', flexShrink: 0, background: '#f9fafb', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: TEXT, margin: 0 }}>Customers</h1>
            <p style={{ fontSize: '14px', color: TEXT_SUB, marginTop: '4px' }}>
              Manage your customer relationships and loyalty.
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setShowModal(true); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: '#4f46e5', color: '#fff',
              border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
            onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
          >
            <FiPlus size={15} /> Add Customer
          </button>
        </div>

        {/* ── Body: left panel + right panel ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT PANEL: Customer list ── */}
          <div style={{
            width: '300px',
            flexShrink: 0,
            background: '#fff',
            borderRight: `1px solid ${BORDER}`,
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Search */}
            <div style={{ padding: '14px 14px 10px' }}>
              <div style={{ position: 'relative' }}>
                <FiSearch size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search name or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 34px',
                    border: `1px solid ${BORDER}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: TEXT,
                    background: '#fff',
                  }}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1 }}>
              {loading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontSize: '14px' }}>
                  Loading…
                </div>
              ) : customers.length === 0 ? (
                /* Empty state */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', color: MUTED, textAlign: 'center' }}>
                  <FiUser size={40} style={{ opacity: .4, marginBottom: '10px' }} />
                  <p style={{ fontSize: '13px', margin: 0 }}>No customers found</p>
                </div>
              ) : (
                customers.map(c => {
                  const isActive = activeCustomer?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveCustomer(c)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        borderRadius: 0,
                        background:  isActive ? PURPLE_BG : 'transparent',
                        borderLeft:  isActive ? `3px solid ${PURPLE_DARK}` : '3px solid transparent',
                        transition:  'background .12s',
                        position:    'relative',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9f9fb'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '40px', height: '40px', minWidth: '40px',
                        borderRadius: '50%',
                        background: PURPLE_BG,
                        color: PURPLE_TEXT,
                        fontWeight: 500,
                        fontSize: '15px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {initials(c.name)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: TEXT, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </p>
                        <p style={{ fontSize: '12px', color: MUTED, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.phone || 'No phone'}
                        </p>
                      </div>

                      {/* Loyalty points badge */}
                      {(c.loyalty_points > 0) && (
                        <span style={{
                          fontSize: '10px', fontWeight: 600,
                          background: '#2563eb', color: '#fff',
                          borderRadius: '20px', padding: '2px 7px',
                          flexShrink: 0, whiteSpace: 'nowrap',
                        }}>
                          {c.loyalty_points} pts
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Customer detail ── */}
          <div style={{ flex: 1, overflow: 'auto', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
            {!activeCustomer ? (
              /* Empty detail state */
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                minHeight: '400px', flex: 1, color: MUTED, textAlign: 'center', padding: '48px',
              }}>
                <FiUser size={48} style={{ opacity: .3, marginBottom: '14px' }} />
                <p style={{ fontSize: '14px', margin: 0 }}>Select a customer to view their details</p>
              </div>
            ) : (
              <>
                {/* Detail header */}
                <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '24px', position: 'relative', flexShrink: 0 }}>
                  {/* Edit / Delete */}
                  <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(activeCustomer)}>
                      <FiEdit2 size={13} /> Edit
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => handleDelete(activeCustomer.id)}
                    >
                      <FiTrash2 size={13} /> Delete
                    </button>
                  </div>

                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: PURPLE_BG, color: PURPLE_TEXT,
                      fontSize: '24px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {initials(activeCustomer.name)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: 700, color: TEXT, margin: 0 }}>{activeCustomer.name}</h2>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '13px', color: TEXT_SUB }}>
                        {activeCustomer.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiPhone size={13} /> {activeCustomer.phone}</span>}
                        {activeCustomer.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiMail size={13} /> {activeCustomer.email}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                    {[
                      { label: 'Total Spend',    value: `₹${activeCustomer.total_spend || 0}`,    color: '#16a34a', bg: '#f0fdf4' },
                      { label: 'Store Visits',   value: activeCustomer.visit_count   || 0,         color: TEXT,      bg: '#f9fafb' },
                      { label: 'Loyalty Points', value: `${activeCustomer.loyalty_points || 0} pts`, color: '#d97706', bg: '#fffbeb' },
                    ].map(s => (
                      <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '14px', border: `1px solid ${BORDER}` }}>
                        <p style={{ fontSize: '11px', color: TEXT_SUB, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600, margin: '0 0 4px' }}>{s.label}</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {activeCustomer.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '16px', fontSize: '13px', color: TEXT_SUB }}>
                      <FiMapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <p style={{ margin: 0 }}>{activeCustomer.address}</p>
                    </div>
                  )}
                </div>

                {/* Order history */}
                <div style={{ flex: 1, padding: '24px', background: '#f9fafb' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: TEXT, margin: '0 0 16px' }}>Order History</h3>
                  <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
                    <FiShoppingBag size={36} style={{ color: '#d1d5db', marginBottom: '12px' }} />
                    <p style={{ fontWeight: 600, color: TEXT, margin: '0 0 4px', fontSize: '15px' }}>No orders yet</p>
                    <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>This customer hasn't placed any orders.</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>Create Order</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: TEXT, margin: 0 }}>
                {editing ? 'Edit Customer' : 'Add Customer'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Name *',   field: 'name',    type: 'text',  required: true  },
                { label: 'Phone',    field: 'phone',   type: 'text',  required: false },
                { label: 'Email',    field: 'email',   type: 'email', required: false },
              ].map(f => (
                <div key={f.field}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: TEXT_SUB, marginBottom: '5px' }}>{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.field]}
                    onChange={e => setForm({ ...form, [f.field]: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: TEXT }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: TEXT_SUB, marginBottom: '5px' }}>Address</label>
                <textarea
                  rows={3}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: TEXT }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
