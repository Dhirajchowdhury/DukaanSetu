import Sidebar from '../components/layout/Sidebar';
import './Dashboard.css';

const Categories = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Categories</h1>
          <p>Organize your products by categories</p>
        </div>
        <div className="card">
          <p>Category management interface coming soon...</p>
          <p>More to add </p>
        </div>
      </main>
    </div>
  );
};

export default Categories;
