import { useState, useEffect, useCallback } from 'react';
import { FiStar, FiTrash2, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Dashboard.css';
import './Pages.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState('');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ratingFilter) params.set('rating', ratingFilter);
      const [feedRes, statsRes] = await Promise.all([
        fetch(`${API}/feedback?${params}`, { credentials: 'include' }),
        fetch(`${API}/feedback/stats`, { credentials: 'include' }),
      ]);
      const feedData = await feedRes.json();
      const statsData = await statsRes.json();
      setFeedback(feedData.feedback || []);
      setStats(statsData.stats || null);
    } catch (err) { toast.error('Failed to load feedback'); }
    finally { setLoading(false); }
  }, [ratingFilter]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this feedback?')) return;
    try {
      await fetch(`${API}/feedback/${id}`, { method: 'DELETE', credentials: 'include' });
      toast.success('Feedback deleted');
      fetchFeedback();
    } catch (err) { toast.error(err.message); }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FiStar key={i} fill={i < rating ? '#F59E0B' : 'none'} color={i < rating ? '#F59E0B' : '#CBD5E1'} size={16} />
    ));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Customer Feedback</h1>
      </div>

      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <FiBarChart2 size={24} />
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Reviews</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgRating}</div>
            <div className="stat-label">Average Rating</div>
          </div>
          <div className="stat-card">
            <div className="distribution-bars">
              {[5, 4, 3, 2, 1].map(r => {
                const count = stats.distribution[r] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={r} className="dist-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ minWidth: '1.5rem', fontSize: '0.8rem' }}>{r}★</span>
                    <div style={{ flex: 1, height: '0.6rem', background: '#E2E8F0', borderRadius: '99px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#F59E0B', borderRadius: '99px' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="search-bar">
        <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} style={{ border: 'none', background: 'transparent', padding: '0.5rem' }}>
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : feedback.length === 0 ? (
        <div className="empty-state"><p>No feedback yet</p></div>
      ) : (
        <div className="feedback-list">
          {feedback.map(f => (
            <div key={f.id} className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong>{f.customer?.name || 'Anonymous'}</strong>
                    <div style={{ display: 'flex' }}>{renderStars(f.rating)}</div>
                  </div>
                  {f.comment && <p style={{ margin: 0, color: '#475569' }}>{f.comment}</p>}
                  <small style={{ color: '#94A3B8' }}>{new Date(f.created_at).toLocaleDateString('en-IN')}</small>
                </div>
                <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(f.id)}><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
