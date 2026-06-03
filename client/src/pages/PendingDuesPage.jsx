import { useState, useEffect } from 'react';
import { FiDollarSign, FiSend, FiUser, FiClock } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';
import './Dashboard.css';

const PendingDuesPage = () => {
  const [dues, setDues] = useState([]);
  const [summary, setSummary] = useState({ totalPending: 0, orderCount: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});

  useEffect(() => {
    fetchDues();
  }, []);

  const fetchDues = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dues');
      setDues(data.dues || []);
      setSummary(data.summary || { totalPending: 0, orderCount: 0 });
    } catch (err) {
      console.error('Failed to load dues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (orderId) => {
    setSending(prev => ({ ...prev, [orderId]: true }));
    try {
      await api.post(`/dues/${orderId}/remind`, { sendEmail: true, sendSms: true });
      toast.success('Reminder sent!');
    } catch (err) {
      toast.error('Failed to send reminder');
    } finally {
      setSending(prev => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header-row">
          <div>
            <h1><FiDollarSign className="inline mr-2" />Pending Dues</h1>
            <p>Unpaid delivered orders that need payment follow-up.</p>
          </div>
          {summary.orderCount > 0 && (
            <div className="card" style={{ padding: '12px 24px', textAlign: 'center' }}>
              <p className="text-sm text-gray-500">Total Pending</p>
              <p className="text-2xl font-bold text-red-600">₹{summary.totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-400">from {summary.orderCount} orders</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-center"><span className="spinner spinner-lg" /> Loading...</div>
        ) : dues.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon"><FiDollarSign /></div>
            <h3>No pending dues</h3>
            <p>All delivered orders have been paid. Great job!</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Buyer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Delivered On</th>
                  <th>Overdue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dues.map(due => (
                  <tr key={due.id}>
                    <td className="font-mono text-xs">#{due.id.slice(0, 8)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400" size={14} />
                        <span>{due.buyer?.shopName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>{due.productName}</td>
                    <td className="font-semibold">₹{parseFloat(due.totalPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="text-gray-500">
                      {new Date(due.deliveryDate).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${due.daysOverdue > 15 ? 'badge-danger' : due.daysOverdue > 7 ? 'badge-warning' : 'badge-neutral'}`}>
                        <FiClock className="mr-1" />{due.daysOverdue}d
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={sending[due.id]}
                        onClick={() => handleSendReminder(due.id)}
                      >
                        <FiSend /> {sending[due.id] ? 'Sending...' : 'Remind'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default PendingDuesPage;
