import { useState, useEffect } from 'react';
import { FiCamera, FiPackage } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import './Dashboard.css';

const StockHistoryPage = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchScans();
  }, [page]);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/scan-history', {
        params: { limit: 50, offset: (page - 1) * 50 },
      });
      setScans(data.scans || []);
      setTotalPages(Math.ceil((data.pagination?.total || 0) / 50) || 1);
    } catch (err) {
      console.error('Failed to load scan history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header">
          <h1><FiCamera className="inline mr-2" />Stock History & Scans</h1>
          <p>Barcode scan and stock activity log.</p>
        </div>

        {loading ? (
          <div className="loading-center"><span className="spinner spinner-lg" /> Loading...</div>
        ) : scans.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon"><FiPackage /></div>
            <h3>No scan history yet</h3>
            <p>Scan barcodes or adjust stock to see activity here.</p>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: 0 }}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map(scan => (
                    <tr key={scan.id}>
                      <td className="font-medium">{scan.product?.productName || 'Unknown'}</td>
                      <td>
                        <span className={`badge ${scan.action === 'add' ? 'badge-success' : scan.action === 'update' ? 'badge-warning' : 'badge-neutral'}`}>
                          {scan.action}
                        </span>
                      </td>
                      <td>{scan.user?.shopName || 'Unknown'}</td>
                      <td className="text-gray-500">
                        {new Date(scan.scannedAt).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default StockHistoryPage;
