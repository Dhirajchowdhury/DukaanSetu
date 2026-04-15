import { useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import StatsCards from '../components/dashboard/StatsCards';
import ProductTable from '../components/dashboard/ProductTable';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, fetchStats, fetchProducts } = useProducts();

  useEffect(() => {
    fetchStats();
    fetchProducts({ limit: 10 });
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Your inventory details, {user?.shopName}!</h1>
          <p>Here's what's happening with your inventory today</p>
          <p>List of items WIll be appeared here </p>
        </div>

        <StatsCards stats={stats} />
        <ProductTable />
      </main>
    </div>
  );
};

export default Dashboard;
