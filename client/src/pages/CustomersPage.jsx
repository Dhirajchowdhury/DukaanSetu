import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiAward } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';
import './Pages.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: '50' });
      const res = await fetch(`${API}/customers?${params}`, { credentials: 'include' });
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editing ? `${API}/customers/${editing.id}` : `${API}/customers`;
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
      fetchCustomers();
    } catch (err) { toast.error(err.message); }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    setShowModal(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setShowModal(true); }}>
          <FiPlus /> Add Customer
        </button>
      </div>

      <div className="search-bar">
        <FiSearch />
        <input type="text" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : customers.length === 0 ? (
        <div className="empty-state"><p>No customers found</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Email</th><th>Points</th><th>Spend</th><th>Visits</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td><span className="badge badge-warning">{c.loyalty_points}</span></td>
                  <td>₹{c.total_spend}</td>
                  <td>{c.visit_count}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}><FiEdit2 /></button>
                    <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDelete(c.id)}><FiTrash2 /></button>
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
            <h2>{editing ? 'Edit Customer' : 'Add Customer'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><FiAward /> {editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
