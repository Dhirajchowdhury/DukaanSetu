import { useState, useEffect } from 'react';
import { FiTrendingUp, FiAward, FiBarChart2 } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import './Dashboard.css';

// BUG 2 — segmented control styles
const segWrap = {
  display: 'flex',
  background: '#f1f1f4',
  borderRadius: '10px',
  padding: '4px',
  width: 'fit-content',
  gap: 0,
  marginBottom: '24px',
};

const segBtn = (active) => ({
  padding: '8px 20px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: active ? 500 : 400,
  border: 'none',
  cursor: 'pointer',
  background: active ? '#fff' : 'transparent',
  color:      active ? 'var(--primary, #2563eb)' : '#6b7280',
  boxShadow:  active ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
  transition: 'all .15s ease',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
});

// BUG 3 — reusable empty state
const EmptyState = () => (
  <div style={{
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    padding: '48px 24px',
    textAlign: 'center',
  }}>
    {/* BUG 3 — 48px muted bar chart icon */}
    <FiBarChart2 size={48} style={{ color: '#d1d5db' }} />
    <p style={{ fontSize: '16px', fontWeight: 500, color: '#111827', margin: 0 }}>
      No ranking data yet
    </p>
    <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0, maxWidth: '320px', lineHeight: 1.6 }}>
      Start selling products to see performance data here
    </p>
  </div>
);

const ProductRankingPage = () => {
  const [tab,     setTab]     = useState('most');
  const [data,    setData]    = useState({ mostSold: [], leastSold: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRanking(); }, []);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/product-ranking');
      setData(res);
    } catch (err) {
      console.error('Failed to load ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  const items = tab === 'most' ? data.mostSold : data.leastSold;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">

        {/* BUG 4 — header: no emoji in h1, subtitle below h1 not top-right */}
        <div className="page-header" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111827', margin: 0 }}>
            Product Performance
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            See your best and worst-selling products.
          </p>
        </div>

        {/* BUG 1 + BUG 2 — segmented tab, no chevron on Least Sold */}
        <div style={segWrap}>
          <button style={segBtn(tab === 'most')} onClick={() => setTab('most')}>
            <FiAward size={15} />
            Most Sold
          </button>
          <button style={segBtn(tab === 'least')} onClick={() => setTab('least')}>
            {/* BUG 1 — FiChevronDown removed; no icon on this tab */}
            Least Sold / Slow Movers
          </button>
        </div>

        {loading ? (
          <div className="loading-center">
            <span className="spinner spinner-lg" /> Loading…
          </div>
        ) : items.length === 0 ? (
          /* BUG 3 — proper empty state for both tabs */
          <EmptyState />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>#</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Product</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Category</th>
                    {tab === 'most'  && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Total Sold</th>}
                    {tab === 'least' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Stock</th>}
                    {tab === 'least' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Days Since Created</th>}
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Price</th>
                    {tab === 'least' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.productId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: '#9ca3af' }}>{i + 1}</td>
                      <td style={{ padding: '13px 16px', fontWeight: 500, color: '#111827' }}>{item.productName}</td>
                      <td style={{ padding: '13px 16px', color: '#6b7280' }}>{item.category}</td>
                      {tab === 'most'  && <td style={{ padding: '13px 16px', fontWeight: 600, color: '#16a34a' }}>{item.totalSold}</td>}
                      {tab === 'least' && <td style={{ padding: '13px 16px', color: '#374151' }}>{item.stockAvailable}</td>}
                      {tab === 'least' && <td style={{ padding: '13px 16px', color: '#374151' }}>{item.daysSinceCreated || 0} days</td>}
                      <td style={{ padding: '13px 16px', color: '#374151' }}>₹{parseFloat(item.pricePerUnit || 0).toFixed(2)}</td>
                      {tab === 'least' && (
                        <td style={{ padding: '13px 16px' }}>
                          <span className="badge badge-warning">Slow Mover</span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductRankingPage;
