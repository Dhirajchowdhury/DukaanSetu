import { useState, useEffect } from 'react';
import { FiTrendingUp, FiChevronDown, FiAward } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import './Dashboard.css';

const ProductRankingPage = () => {
  const [tab, setTab] = useState('most');
  const [data, setData] = useState({ mostSold: [], leastSold: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

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
        <div className="page-header">
          <h1><FiTrendingUp className="inline mr-2" />Product Performance</h1>
          <p>See your best and worst-selling products.</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            className={`btn ${tab === 'most' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('most')}
          >
            <FiAward /> Most Sold
          </button>
          <button
            className={`btn ${tab === 'least' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('least')}
          >
            <FiChevronDown /> Least Sold / Slow Movers
          </button>
        </div>

        {loading ? (
          <div className="loading-center"><span className="spinner spinner-lg" /> Loading...</div>
        ) : items.length === 0 ? (
          <div className="card empty-state">
            <h3>No data available yet</h3>
            <p>Start selling products to see ranking data.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  {tab === 'most' && <th>Total Sold</th>}
                  {tab === 'least' && <th>Stock</th>}
                  {tab === 'least' && <th>Days Since Created</th>}
                  <th>Price</th>
                  {tab === 'least' && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.productId}>
                    <td className="font-bold text-gray-400">{i + 1}</td>
                    <td className="font-medium">{item.productName}</td>
                    <td>{item.category}</td>
                    {tab === 'most' && <td className="font-semibold text-green-600">{item.totalSold}</td>}
                    {tab === 'least' && <td>{item.stockAvailable}</td>}
                    {tab === 'least' && <td>{item.daysSinceCreated || 0} days</td>}
                    <td>₹{parseFloat(item.pricePerUnit || 0).toFixed(2)}</td>
                    {tab === 'least' && (
                      <td>
                        <span className="badge badge-warning">Slow Mover</span>
                      </td>
                    )}
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

export default ProductRankingPage;
