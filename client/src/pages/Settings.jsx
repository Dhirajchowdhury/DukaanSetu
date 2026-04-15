import Sidebar from '../components/layout/Sidebar';
import './Dashboard.css';

const Settings = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>
        <div className="card">
          <p>Settings interface coming soon...</p>
        </div>
      </main>
    </div>
  );
};

export default Settings;
