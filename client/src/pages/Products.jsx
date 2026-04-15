import Sidebar from '../components/layout/Sidebar';
import ProductTable from '../components/dashboard/ProductTable';
import './Dashboard.css';

const Products = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header">
          <h1>Products</h1>
          <p>Manage your entire inventory in one place.</p>
        </div>
        <ProductTable />
      </main>
    </div>
  );
};

export default Products;
