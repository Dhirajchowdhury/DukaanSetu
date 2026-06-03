import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardContent from '../../components/dashboard/DashboardContent';

const ShopOwnerDashboard = () => {
  return (
    <DashboardShell roleName="Shop Owner">
      <DashboardContent />
    </DashboardShell>
  );
};

export default ShopOwnerDashboard;
