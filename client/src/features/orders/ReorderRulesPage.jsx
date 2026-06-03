import React, { useState, useEffect } from 'react';
import {
  FiRefreshCw, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight,
  FiPackage, FiAlertCircle, FiCheckCircle, FiXCircle, FiClock,
  FiChevronDown,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

const DRAFT_STATUS = {
  pending_approval: { label: 'Awaiting Approval', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  approved:         { label: 'Approved',           color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  rejected:         { label: 'Rejected',           color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  expired:          { label: 'Expired',            color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
};

// ── subcomponent: Add Rule Form ───────────────────────────────────────────────
const AddRuleForm = ({ suppliers, onSave, onCancel }) => {
  const [supplierId, setSupplierId]       = useState('');
  const [supplierProducts, setProducts]   = useState([]);
  const [loadingProds, setLoadingProds]   = useState(false);
  const [productId, setProductId]         = useState('');
  const [triggerQty, setTriggerQty]       = useState(10);
  const [reorderQty, setReorderQty]       = useState(50);
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    if (!supplierId) { setProducts([]); setProductId(''); return; }
    setLoadingProds(true);
    api.get('/connect', { params: { wholesalerId: supplierId, limit: 100 } })
      .then(({ data }) => setProducts(data.products || []))
      .catch(() => toast.error('Could not load supplier products'))
      .finally(() => setLoadingProds(false));
  }, [supplierId]);

  const handleSave = async () => {
    if (!supplierId || !productId) return toast.error('Select a supplier and a product');
    if (reorderQty < 1)           return toast.error('Reorder quantity must be at least 1');
    setSaving(true);
    try {
      await onSave({ supplierId, productId, triggerQty: Number(triggerQty), reorderQty: Number(reorderQty) });
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = supplierProducts.find(p => p.id === productId);

  return (
    <div style={{
      background: '#fafbff', border: '1.5px solid #c7d2fe',
      borderRadius: 16, padding: 24, marginBottom: 20,
      animation: 'slideDown .18s ease',
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#3730a3', marginBottom: 18 }}>
        ➕ New Auto-Reorder Rule
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Supplier */}
        <div>
          <label style={labelStyle}>Supplier</label>
          <select style={selectStyle} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">— Select supplier —</option>
            {suppliers.map(c => (
              <option key={c.id} value={c.otherUser?.id}>{c.otherUser?.shop_name}</option>
            ))}
          </select>
        </div>

        {/* Product */}
        <div>
          <label style={labelStyle}>Product</label>
          <select
            style={selectStyle}
            value={productId}
            onChange={e => setProductId(e.target.value)}
            disabled={!supplierId || loadingProds}
          >
            <option value="">{loadingProds ? 'Loading…' : '— Select product —'}</option>
            {supplierProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.product_name} ({p.stock_available} {p.unit} avail.)
              </option>
            ))}
          </select>
          {selectedProduct && (
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              MOQ: {selectedProduct.moq} · Price: {fmt(selectedProduct.price_per_unit)}/{selectedProduct.unit}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Trigger qty */}
        <div>
          <label style={labelStyle}>Trigger When Stock At or Below</label>
          <input
            type="number" min={0} style={inputStyle}
            value={triggerQty}
            onChange={e => setTriggerQty(e.target.value)}
          />
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            Draft order is created when supplier stock ≤ this number
          </p>
        </div>
        {/* Reorder qty */}
        <div>
          <label style={labelStyle}>Quantity to Order</label>
          <input
            type="number" min={selectedProduct?.moq || 1} style={inputStyle}
            value={reorderQty}
            onChange={e => setReorderQty(e.target.value)}
          />
          {selectedProduct && Number(reorderQty) < selectedProduct.moq && (
            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
              ⚠ Below MOQ of {selectedProduct.moq}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || !supplierId || !productId}
          style={{ ...saveBtnStyle, opacity: (saving || !supplierId || !productId) ? .55 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Rule'}
        </button>
      </div>
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────
const ReorderRulesPage = () => {
  const [rules,      setRules]      = useState([]);
  const [drafts,     setDrafts]     = useState([]);
  const [suppliers,  setSuppliers]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAddForm, setShowAdd]   = useState(false);
  const [resolving,  setResolving]  = useState(null); // draftId being approved/rejected

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rulesRes, draftsRes, connRes] = await Promise.all([
        api.get('/reorder-rules'),
        api.get('/reorder-rules/drafts'),
        api.get('/connections', { params: { status: 'accepted' } }),
      ]);
      setRules(rulesRes.data.rules || []);
      setDrafts(draftsRes.data.drafts || []);
      setSuppliers(connRes.data.connections || []);
    } catch {
      toast.error('Failed to load reorder data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── rule actions ────────────────────────────────────────────────────────────
  const handleAddRule = async (payload) => {
    try {
      await api.post('/reorder-rules', payload);
      toast.success('Reorder rule saved!');
      setShowAdd(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule');
    }
  };

  const toggleRule = async (rule) => {
    try {
      await api.put(`/reorder-rules/${rule.id}`, { isActive: !rule.is_active });
      toast.success(rule.is_active ? 'Rule paused' : 'Rule activated');
      fetchAll();
    } catch {
      toast.error('Failed to update rule');
    }
  };

  const deleteRule = async (id) => {
    if (!window.confirm('Delete this reorder rule?')) return;
    try {
      await api.delete(`/reorder-rules/${id}`);
      toast.success('Rule deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  // ── draft actions ───────────────────────────────────────────────────────────
  const resolveDraft = async (id, action) => {
    setResolving(id);
    try {
      const res = await api.put(`/reorder-rules/drafts/${id}`, { action });
      toast.success(res.data.message);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update draft');
    } finally {
      setResolving(null);
    }
  };

  const pendingDrafts = drafts.filter(d => d.status === 'pending_approval');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 32px', minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>Auto-Reorder Rules</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
              Set per-product triggers — drafts are auto-created when supplier stock falls low.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(v => !v)}
            style={{ ...saveBtnStyle, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FiPlus size={15} />
            {showAddForm ? 'Cancel' : 'Add Rule'}
          </button>
        </div>
      </div>

      {/* ── Add rule form ── */}
      {showAddForm && (
        <AddRuleForm
          suppliers={suppliers}
          onSave={handleAddRule}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* ── Pending draft orders banner ── */}
      {pendingDrafts.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #fde68a',
          borderRadius: 14, padding: '16px 20px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <FiAlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: 14 }}>
              {pendingDrafts.length} draft order{pendingDrafts.length > 1 ? 's' : ''} awaiting your approval
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#b45309' }}>
              Auto-reorder rules triggered these — review below and approve or reject each one.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 72, background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }} className="animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Draft orders section ── */}
          {drafts.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
                Draft Orders
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {drafts.map(draft => {
                  const meta = DRAFT_STATUS[draft.status] || DRAFT_STATUS.pending_approval;
                  const isPending = draft.status === 'pending_approval';
                  return (
                    <div key={draft.id} style={{
                      background: '#fff', borderRadius: 16,
                      border: `1.5px solid ${isPending ? '#fde68a' : '#f1f5f9'}`,
                      padding: '18px 22px',
                      display: 'flex', alignItems: 'center', gap: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,.05)',
                    }}>
                      {/* Product icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <FiPackage size={18} style={{ color: '#4f46e5' }} />
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                          {draft.product?.product_name || 'Product'}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                          {draft.quantity} {draft.product?.unit || 'units'} ×{' '}
                          {fmt(draft.unit_price)} from {draft.supplier?.shop_name}
                          {' · '}
                          <strong style={{ color: '#4f46e5' }}>{fmt(draft.total_price)}</strong>
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>
                          Triggered {new Date(draft.triggered_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>

                      {/* Status badge */}
                      <div style={{
                        padding: '5px 12px', borderRadius: 20,
                        background: meta.bg, border: `1px solid ${meta.border}`,
                        color: meta.color, fontSize: 11, fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        {meta.label}
                      </div>

                      {/* Action buttons */}
                      {isPending && (
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => resolveDraft(draft.id, 'approve')}
                            disabled={resolving === draft.id}
                            style={{
                              padding: '8px 16px', borderRadius: 10,
                              background: '#4f46e5', color: '#fff', border: 'none',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 5,
                              opacity: resolving === draft.id ? .6 : 1,
                            }}
                          >
                            <FiCheckCircle size={13} />
                            Approve
                          </button>
                          <button
                            onClick={() => resolveDraft(draft.id, 'reject')}
                            disabled={resolving === draft.id}
                            style={{
                              padding: '8px 14px', borderRadius: 10,
                              background: '#fef2f2', color: '#ef4444',
                              border: '1px solid #fca5a5',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 5,
                              opacity: resolving === draft.id ? .6 : 1,
                            }}
                          >
                            <FiXCircle size={13} />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Rules section ── */}
          <section>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
              Active Rules ({rules.length})
            </h2>

            {rules.length === 0 ? (
              <div style={{
                background: '#fff', borderRadius: 20, border: '1.5px dashed #e5e7eb',
                padding: '48px 32px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 12, opacity: .3 }}>🔄</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#374151', margin: 0 }}>No rules yet</h3>
                <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 6 }}>
                  Add a rule to get draft orders auto-created when a supplier's stock runs low.
                </p>
                <button
                  onClick={() => setShowAdd(true)}
                  style={{ ...saveBtnStyle, marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <FiPlus size={14} /> Add Your First Rule
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rules.map(rule => (
                  <div key={rule.id} style={{
                    background: '#fff', borderRadius: 16,
                    border: '1.5px solid #f1f5f9',
                    padding: '18px 22px',
                    display: 'flex', alignItems: 'center', gap: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                    opacity: rule.is_active ? 1 : .6,
                    transition: 'opacity .2s',
                  }}>
                    {/* Product icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: rule.is_active ? '#eef2ff' : '#f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <FiRefreshCw size={18} style={{ color: rule.is_active ? '#4f46e5' : '#9ca3af' }} />
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                        {rule.product?.product_name || 'Product'}
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>
                          from {rule.supplier?.shop_name}
                        </span>
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                        🎯 Trigger when stock ≤ <strong>{rule.trigger_qty}</strong>
                        {' · '}
                        📦 Order <strong>{rule.reorder_qty} {rule.product?.unit || 'units'}</strong>
                        {' · '}
                        💰 ~{fmt((rule.product?.price_per_unit || 0) * rule.reorder_qty)}
                      </p>
                      {rule.last_triggered_at && (
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>
                          Last triggered: {new Date(rule.last_triggered_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>

                    {/* Status pill */}
                    <div style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: rule.is_active ? '#ecfdf5' : '#f9fafb',
                      color:      rule.is_active ? '#10b981' : '#9ca3af',
                      border:     `1px solid ${rule.is_active ? '#a7f3d0' : '#e5e7eb'}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {rule.is_active ? '● Active' : '○ Paused'}
                    </div>

                    {/* Toggle + delete */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleRule(rule)}
                        title={rule.is_active ? 'Pause rule' : 'Activate rule'}
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: rule.is_active ? '#eff6ff' : '#f9fafb',
                          border: `1.5px solid ${rule.is_active ? '#bfdbfe' : '#e5e7eb'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: rule.is_active ? '#3b82f6' : '#9ca3af',
                        }}
                      >
                        {rule.is_active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        title="Delete rule"
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: '#fef2f2', border: '1.5px solid #fca5a5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#ef4444',
                        }}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ── shared micro-styles ───────────────────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 };
const selectStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 13, color: '#1e293b', background: '#fff',
  appearance: 'none', cursor: 'pointer',
};
const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 13, color: '#1e293b', background: '#fff',
  boxSizing: 'border-box',
};
const saveBtnStyle = {
  padding: '10px 20px', background: '#4f46e5', color: '#fff',
  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
  cursor: 'pointer',
};
const cancelBtnStyle = {
  padding: '10px 18px', background: '#fff', color: '#6b7280',
  border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13,
  fontWeight: 600, cursor: 'pointer',
};

export default ReorderRulesPage;
