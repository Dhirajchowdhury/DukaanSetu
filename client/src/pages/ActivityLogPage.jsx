import { useState, useEffect } from 'react';
import { FiClock, FiFilter, FiUser, FiActivity } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import './Dashboard.css';

const ACTION_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  adjust_stock: 'Adjusted Stock',
};

const ActivityLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filter) params.action = filter;
      const { data } = await api.get('/activity', { params });
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header-row">
          <div>
            <h1><FiActivity className="inline mr-2" />Activity Log</h1>
            <p>Track all actions performed in your account.</p>
          </div>
          <div className="flex gap-2 items-center">
            <FiFilter className="text-gray-400" />
            <select
              className="form-input"
              style={{ width: 180 }}
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="delete">Deleted</option>
              <option value="adjust_stock">Stock Adjust</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><span className="spinner spinner-lg" /> Loading activity log...</div>
        ) : logs.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon"><FiClock /></div>
            <h3>No activity recorded yet</h3>
            <p>Actions like creating products, placing orders, and adjusting stock will appear here.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="divide-y">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition">
                  <div className="p-2 rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
                    <FiClock size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{log.user?.shopName || 'System'}</span>
                      <span className="badge badge-neutral text-xs">{log.action}</span>
                      <span className="text-xs text-gray-400">{log.entity}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ActivityLogPage;
