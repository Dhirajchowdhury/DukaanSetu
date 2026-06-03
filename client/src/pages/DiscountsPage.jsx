import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Dashboard.css';
import './Pages.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TYPE_OPTIONS = [
  { value: 'bulk', label: 'Bulk Discount' },
  { value: 'expiry', label: 'Expiry-based' },
  { value: 'festival', label: 'Festival Offer' },
  { value: 'manual', label: 'Manual' },
];

export default function DiscountsPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'bulk', condition_json: '{}', discount_pct: 10 });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/discount-rules`, { credentials: 'include' });
      const data = await res.json();
      setRules(data.rules || []);
    } catch (err) { toast.error('Failed to load discount rules'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(form.condition_json);
      const url = editing ? `${API}/discount-rules/${editing.id}` : `${API}/discount-rules`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, condition_json: parsed }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      toast.success(editing ? 'Rule updated' : 'Rule created');
      setShowModal(false); setEditing(null);
      setForm({ name: '', type: 'bulk', condition_json: '{}', discount_pct: 10 });
      fetchRules();
    } catch (err) {
      if (err.message.includes('JSON')) toast.error('Invalid JSON in conditions');
      else toast.error(err.message);
    }
  };

  const toggleActive = async (rule) => {
    try {
      const res = await fetch(`${API}/discount-rules/${rule.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !rule.active }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Rule ${rule.active ? 'disabled' : 'enabled'}`);
      fetchRules();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await fetch(`${API}/discount-rules/${id}`, { method: 'DELETE', credentials: 'include' });
      toast.success('Rule deleted');
      fetchRules();
    } catch (err) { toast.error(err.message); }
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name, type: r.type, condition_json: JSON.stringify(r.condition_json, null, 2), discount_pct: r.discount_pct });
    setShowModal(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Discount Rules</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', type: 'bulk', condition_json: '{}', discount_pct: 10 }); setShowModal(true); }}>
          <FiPlus /> Add Rule
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : rules.length === 0 ? (
        <div className="empty-state"><p>No discount rules yet</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Type</th><th>Discount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td><span className="badge badge-info">{TYPE_OPTIONS.find(t => t.value === r.type)?.label || r.type}</span></td>
                  <td><span className="badge badge-success">{r.discount_pct}%</span></td>
                  <td><span className={`badge ${r.active ? 'badge-success' : 'badge-secondary'}`}>{r.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="actions-cell">
                    <button className="btn-icon" title="Toggle active" onClick={() => toggleActive(r)}>
                      {r.active ? <FiToggleRight /> : <FiToggleLeft />}
                    </button>
                    <button className="btn-icon" title="Edit" onClick={() => openEdit(r)}><FiEdit2 /></button>
                    <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDelete(r.id)}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Rule' : 'New Discount Rule'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Rule Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount % *</label>
                  <input type="number" min="1" max="100" required value={form.discount_pct} onChange={e => setForm({ ...form, discount_pct: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-group">
                <label>Conditions (JSON)</label>
                <textarea rows={6} value={form.condition_json} onChange={e => setForm({ ...form, condition_json: e.target.value })} placeholder='{"minQty": 10, "productIds": ["..."]}' />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
