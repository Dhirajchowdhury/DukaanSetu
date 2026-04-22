import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const Orders = () => {
  const { orders, loading, updateStatus, cancelOrder } = useOrders();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');

  const filteredOrders = orders.filter(o => filter === 'All' || o.status === filter);

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Orders</h1>
          <p>Track and manage your inventory orders.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/orders/new')}>Place New Order</button>
      </div>

      <div className="filters-section" style={{ marginBottom: '20px' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px' }}>
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Accepted">Accepted</option>
          <option value="Ready">Ready</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th>Order ID</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Total Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order._id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px 0' }}>{order._id.substring(0, 8)}...</td>
                <td>{order.supplierId?.name || 'Unknown'}</td>
                <td>
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>${order.totalAmount.toFixed(2)}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  {order.status === 'Pending' && (
                    <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(order._id)}>Cancel</button>
                  )}
                  {order.status === 'Accepted' && (
                    <button className="btn btn-success btn-sm" onClick={() => updateStatus(order._id, 'Delivered')}>Mark Delivered</button>
                  )}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr><td colSpan="6">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </Layout>
  );
};

export default Orders;
