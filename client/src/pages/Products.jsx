import Sidebar from '../components/layout/Sidebar';
import './Dashboard.css';

const Products = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Products</h1>
          <p>Manage your inventory products</p>
        </div>
        <div className="card">
          <p>Full product management interface coming soon...</p>
        </div>
      </main>
    </div>
  );
};

export default Products;
