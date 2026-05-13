import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import OrdersFeature from '../features/orders/Orders';

const Orders = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main" style={{ padding: 0 }}>
        <OrdersFeature />
      </main>
    </div>
  );
};

export default Orders;
