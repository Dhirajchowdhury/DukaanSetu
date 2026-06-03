import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Dashboard.css';
import './Pages.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ customer_id: '', product_name: '', quantity: 1, unit: 'units', frequency: 'weekly', next_delivery: '' });
  const [customers, setCustomers] = useState([]);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/subscriptions`, { credentials: 'include' });
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) { toast.error('Failed to load subscriptions'); }
    finally { setLoading(false); }
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API}/customers?limit=200`, { credentials: 'include' });
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) { /* ignore */ }
  };

  useEffect(() => { fetchSubscriptions(); fetchCustomers(); }, [fetchSubscriptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editing ? `${API}/subscriptions/${editing.id}` : `${API}/subscriptions`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      toast.success(editing ? 'Subscription updated' : 'Subscription created');
      setShowModal(false); setEditing(null);
      setForm({ customer_id: '', product_name: '', quantity: 1, unit: 'units', frequency: 'weekly', next_delivery: '' });
      fetchSubscriptions();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subscription?')) return;
    try {
      await fetch(`${API}/subscriptions/${id}`, { method: 'DELETE', credentials: 'include' });
      toast.success('Subscription deleted');
      fetchSubscriptions();
    } catch (err) { toast.error(err.message); }
  };

  const handleGenerate = async (id) => {
    try {
      const res = await fetch(`${API}/subscriptions/${id}/generate-deliveries`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Delivery schedule generated');
    } catch (err) { toast.error(err.message); }
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      customer_id: s.customer_id, product_name: s.product_name, quantity: s.quantity,
      unit: s.unit || 'units', frequency: s.frequency, next_delivery: s.next_delivery,
    });
    setShowModal(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Subscriptions</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ customer_id: '', product_name: '', quantity: 1, unit: 'units', frequency: 'weekly', next_delivery: '' }); setShowModal(true); }}>
          <FiPlus /> Add Subscription
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : subscriptions.length === 0 ? (
        <div className="empty-state"><p>No subscriptions yet</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Customer</th><th>Product</th><th>Qty</th><th>Frequency</th><th>Next Delivery</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {subscriptions.map(s => (
                <tr key={s.id}>
                  <td>{s.customer?.name || 'N/A'}</td>
                  <td>{s.product_name}</td>
                  <td>{s.quantity} {s.unit}</td>
                  <td><span className="badge badge-info">{s.frequency}</span></td>
                  <td>{new Date(s.next_delivery).toLocaleDateString('en-IN')}</td>
                  <td><span className={`badge ${s.active ? 'badge-success' : 'badge-secondary'}`}>{s.active ? 'Active' : 'Paused'}</span></td>
                  <td className="actions-cell">
                    <button className="btn-icon" title="Generate deliveries" onClick={() => handleGenerate(s.id)}><FiCalendar /></button>
                    <button className="btn-icon" title="Edit" onClick={() => openEdit(s)}><FiEdit2 /></button>
                    <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDelete(s.id)}><FiTrash2 /></button>
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
            <h2>{editing ? 'Edit Subscription' : 'New Subscription'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Customer *</label>
                <select required value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'N/A'})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Product Name *</label>
                <input type="text" required value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 1 })} />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input type="text" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency *</label>
                  <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Next Delivery *</label>
                  <input type="date" required value={form.next_delivery} onChange={e => setForm({ ...form, next_delivery: e.target.value })} />
                </div>
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
