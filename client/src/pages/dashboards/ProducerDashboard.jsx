import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardContent from '../../components/dashboard/DashboardContent';
import { Bar, Pie, Line } from 'react-chartjs-2';
import api from '../../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const ProducerDashboard = () => {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const { data } = await api.get('/analytics/producer-insights');
      setInsights(data);
    } catch (err) {
      console.error('Failed to load producer insights:', err);
    }
  };

  return (
    <DashboardShell roleName="Producer">
      <DashboardContent />

      {/* Producer-Specific Charts */}
      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Demand for my products */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold mb-3">Demand for My Products</h3>
            <div className="flex-1 min-h-0 relative">
              {insights.demandByMonth?.length > 0 ? (
                <Bar data={{
                  labels: insights.demandByMonth.map(d => d.month),
                  datasets: [{
                    label: 'Orders',
                    data: insights.demandByMonth.map(d => d.orders),
                    backgroundColor: '#f59e0b',
                    borderRadius: 4,
                  }]
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { borderDash: [5, 5] } } },
                }} />
              ) : <p className="text-sm text-gray-400">No demand data yet.</p>}
            </div>
          </div>

          {/* Top buyers */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold mb-3">Top Buyers</h3>
            <div className="flex-1 min-h-0 relative">
              {insights.topBuyers?.length > 0 ? (
                <Pie data={{
                  labels: insights.topBuyers.map(b => b.shopName),
                  datasets: [{
                    data: insights.topBuyers.map(b => b.totalSpend),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                    borderWidth: 1,
                  }]
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } } },
                }} />
              ) : <p className="text-sm text-gray-400">No buyer data yet.</p>}
            </div>
          </div>

          {/* Monthly production trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold mb-3">Monthly Production Trend</h3>
            <div className="flex-1 min-h-0 relative">
              {insights.productionByMonth?.length > 0 ? (
                <Line data={{
                  labels: insights.productionByMonth.map(d => d.month),
                  datasets: [{
                    label: 'Products Added',
                    data: insights.productionByMonth.map(d => d.count),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#10b981',
                  }]
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                }} />
              ) : <p className="text-sm text-gray-400">No production data yet.</p>}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default ProducerDashboard;
