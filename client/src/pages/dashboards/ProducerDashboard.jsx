import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardContent from '../../components/dashboard/DashboardContent';

const ProducerDashboard = () => {
  return (
    <DashboardShell roleName="Producer">
      <DashboardContent />
    </DashboardShell>
  );
};

export default ProducerDashboard;
