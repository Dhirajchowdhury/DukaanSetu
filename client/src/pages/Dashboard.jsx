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
    fetchProducts({ limit: 8 });
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header">
          <h1>{greeting()}, {user?.shopName} 👋</h1>
          <p>Here's what's happening with your inventory today.</p>
        </div>

        <StatsCards stats={stats} />
        <ProductTable compact />
      </main>
    </div>
  );
};

export default Dashboard;
