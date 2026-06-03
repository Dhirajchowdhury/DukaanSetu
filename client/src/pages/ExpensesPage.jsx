import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Pie } from 'react-chartjs-2';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

const CATEGORIES = ['rent', 'salary', 'utilities', 'transport', 'misc'];
const CATEGORY_LABELS = { rent: 'Rent', salary: 'Salary', utilities: 'Utilities', transport: 'Transport', misc: 'Miscellaneous' };
const CATEGORY_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ amount: '', category: 'misc', description: '', date: new Date().toISOString().split('T')[0] });
  const [filterCat, setFilterCat] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => { fetchExpenses(); }, [filterCat, filterFrom, filterTo]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCat) params.category = filterCat;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const { data } = await api.get('/expenses', { params });
      setExpenses(data.expenses || []);
      setCategoryTotals(data.categoryTotals || {});
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.category) return toast.error('Amount and category required');
    try {
      if (editing) {
        await api.put(`/expenses/${editing}`, form);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', form);
        toast.success('Expense added');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ amount: '', category: 'misc', description: '', date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch { toast.error('Failed to delete'); }
  };

  const handleEdit = (exp) => {
    setEditing(exp.id);
    setForm({ amount: exp.amount, category: exp.category, description: exp.description, date: exp.date });
    setShowForm(true);
  };

  const pieData = {
    labels: Object.keys(categoryTotals).map(k => CATEGORY_LABELS[k] || k),
    datasets: [{
      data: Object.values(categoryTotals),
      backgroundColor: Object.keys(categoryTotals).map(k => CATEGORY_COLORS[CATEGORIES.indexOf(k)] || '#94a3b8'),
      borderWidth: 1,
    }],
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
              <p className="text-sm text-gray-500">Track and manage your business expenses</p>
            </div>
            <button onClick={() => { setEditing(null); setForm({ amount: '', category: 'misc', description: '', date: new Date().toISOString().split('T')[0] }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
              <FiPlus /> Add Expense
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm lg:col-span-1">
              <h3 className="font-bold text-gray-900 mb-4">By Category</h3>
              {Object.keys(categoryTotals).length > 0 ? (
                <div className="h-64">
                  <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }} />
                </div>
              ) : <p className="text-sm text-gray-400">No expenses yet.</p>}
            </div>

            {/* Expense List */}
            <div className="lg:col-span-2">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="From" />
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="To" />
              </div>

              {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-4">
                  <h3 className="font-bold text-gray-900 mb-4">{editing ? 'Edit' : 'Add'} Expense</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₹)</label>
                      <input type="number" step="0.01" min="0" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                      <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional description" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                      <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">{editing ? 'Update' : 'Save'} Expense</button>
                    <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </form>
              )}

              {/* Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold">Description</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                      ) : expenses.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No expenses found.</td></tr>
                      ) : expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700">{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{
                              backgroundColor: CATEGORY_COLORS[CATEGORIES.indexOf(exp.category)] + '20',
                              color: CATEGORY_COLORS[CATEGORIES.indexOf(exp.category)] || '#64748b',
                            }}>
                              {CATEGORY_LABELS[exp.category] || exp.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{exp.description || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleEdit(exp)} className="text-gray-400 hover:text-indigo-600 mr-2"><FiEdit2 size={14} /></button>
                            <button onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExpensesPage;
