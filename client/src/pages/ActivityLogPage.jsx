import { useState, useEffect } from 'react';
import { FiClock, FiFilter, FiUser, FiActivity, FiPackage, FiTrash2, FiEdit2, FiPlus } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';

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

  const groupedLogs = logs.reduce((acc, log) => {
    const d = new Date(log.createdAt);
    const dateKey = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {});

  const getActionStyles = (action) => {
    if (action === 'create') return { bg: 'bg-green-100 text-green-600', icon: <FiPlus size={14} /> };
    if (action === 'delete') return { bg: 'bg-red-100 text-red-600', icon: <FiTrash2 size={14} /> };
    if (action === 'update') return { bg: 'bg-blue-100 text-blue-600', icon: <FiEdit2 size={14} /> };
    if (action === 'adjust_stock') return { bg: 'bg-amber-100 text-amber-600', icon: <FiPackage size={14} /> };
    return { bg: 'bg-indigo-100 text-indigo-600', icon: <FiActivity size={14} /> };
  };

  const getActionLabel = (action, entity) => {
    const entityName = entity ? entity.toLowerCase() : 'item';
    if (action === 'create') return `created a new ${entityName}`;
    if (action === 'delete') return `deleted a ${entityName}`;
    if (action === 'update') return `updated a ${entityName}`;
    if (action === 'adjust_stock') return `adjusted stock for ${entityName}`;
    return `performed action on ${entityName}`;
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main py-8 px-4 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Activity Log</h1>
            <p className="text-gray-500 mt-1">Track all actions performed in your account.</p>
          </div>
          <div className="flex gap-2 items-center bg-white p-2 border border-gray-200 rounded-xl shadow-sm">
            <FiFilter className="text-gray-400 ml-2" />
            <select
              className="bg-transparent border-none text-sm font-semibold text-gray-700 outline-none pr-4"
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
          <div className="flex justify-center py-20"><span className="spinner spinner-lg" /></div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <FiClock className="mx-auto text-4xl text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No activity recorded</h3>
            <p className="text-gray-500 mt-1">Actions like creating products and adjusting stock will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {Object.entries(groupedLogs).map(([date, items]) => (
              <div key={date}>
                <div className="sticky top-0 bg-gray-50 px-6 py-2 border-y border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider z-10">
                  {date}
                </div>
                <div className="p-6 relative">
                  {/* Vertical line for the timeline */}
                  <div className="absolute left-[92px] top-0 bottom-0 w-px bg-gray-100" />
                  
                  <div className="space-y-6">
                    {items.map((log) => {
                      const { bg, icon } = getActionStyles(log.action);
                      return (
                        <div key={log.id} className="flex gap-6 relative group">
                          {/* Time on left */}
                          <div className="w-[60px] text-right shrink-0 pt-1.5">
                            <span className="text-xs font-bold text-gray-400 group-hover:text-gray-600 transition-colors">
                              {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          {/* Icon circle */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-white ${bg}`}>
                            {icon}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pb-2">
                            <div className="flex items-baseline gap-2 flex-wrap mb-1">
                              <span className="font-bold text-gray-900 text-sm">{log.user?.shopName || 'System'}</span>
                              <span className="text-sm text-gray-600">{getActionLabel(log.action, log.entity)}</span>
                            </div>
                            {log.description && (
                              <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-4 border border-gray-100 group-hover:border-gray-200 transition-colors">
                                {log.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ActivityLogPage;
