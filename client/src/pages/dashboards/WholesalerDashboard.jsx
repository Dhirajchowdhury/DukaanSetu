import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardContent from '../../components/dashboard/DashboardContent';

const WholesalerDashboard = () => {
  return (
    <DashboardShell roleName="Wholesaler">
      <DashboardContent />
    </DashboardShell>
  );
};

export default WholesalerDashboard;
