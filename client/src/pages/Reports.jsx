import Sidebar from '../components/layout/Sidebar';
import './Dashboard.css';

const Reports = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Reports & Analytics</h1>
          <p>View insights and export reports</p>
        </div>
        <div className="card">
          <p>Reports and analytics dashboard coming soon...</p>
          <p>Page under development</p>
        </div>
      </main>
    </div>
  );
};

export default Reports;
