import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import ReorderRulesPage from '../features/orders/ReorderRulesPage';

const ReorderPage = () => (
  <div className="dashboard-layout">
    <Sidebar />
    <main className="dashboard-main" style={{ padding: 0 }}>
      <ReorderRulesPage />
    </main>
  </div>
);

export default ReorderPage;
