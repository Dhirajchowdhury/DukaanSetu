import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import BulkOrderForm from '../features/orders/BulkOrderForm';

const BulkOrderPage = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main" style={{ padding: 0 }}>
        <BulkOrderForm />
      </main>
    </div>
  );
};

export default BulkOrderPage;
