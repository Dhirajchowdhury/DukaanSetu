import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardContent from '../../components/dashboard/DashboardContent';

const DistributorDashboard = () => {
  return (
    <DashboardShell roleName="Distributor">
      <DashboardContent />
    </DashboardShell>
  );
};

export default DistributorDashboard;
