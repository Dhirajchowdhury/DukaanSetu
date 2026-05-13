import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import ConnectFeature from '../features/connect/Connect';

const Connect = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main" style={{ padding: 0 }}>
        <ConnectFeature />
      </main>
    </div>
  );
};

export default Connect;
