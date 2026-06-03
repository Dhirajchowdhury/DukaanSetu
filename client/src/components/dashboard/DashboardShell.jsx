import React from 'react';
import Sidebar from '../layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import '../layout/Sidebar.css';

const DashboardShell = ({ roleName, children }) => {
  const { user } = useAuth();

  const greeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Dynamic configurations based on role to match screenshot design
  const roleConfig = (() => {
    const role = user?.role || '';
    if (role === 'producer') {
      return {
        icon: '🌾',
        borderColor: 'border-orange-300',
        textColor: 'text-amber-500',
        accentBg: 'bg-amber-500',
      };
    }
    if (role === 'distributor') {
      return {
        icon: '🚚',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-600',
        accentBg: 'bg-purple-600',
      };
    }
    if (role === 'wholesaler') {
      return {
        icon: '🏭',
        borderColor: 'border-emerald-300',
        textColor: 'text-emerald-600',
        accentBg: 'bg-emerald-600',
      };
    }
    // Default / Shop Owner
    return {
      icon: '🏪',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-600',
      accentBg: 'bg-blue-600',
    };
  })();

  const resolvedRoleName = roleName || (
    user?.role === 'producer' ? 'Producer' : 
    user?.role === 'distributor' ? 'Distributor' : 
    user?.role === 'wholesaler' ? 'Wholesaler' : 
    'Shop Owner'
  );

  const roleClass = user?.role || 'shop_owner';

  return (
    <div className="dashboard-layout bg-gray-50">

      <Sidebar />

      <main className="dashboard-main bg-gray-50 overflow-x-hidden">

        <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">

          {/* HEADER */}
          <div
            style={{
              padding: '24px 32px',
              marginBottom: '32px',
              borderRadius: '16px',
            }}
            className={`bg-white border flex justify-between items-center relative overflow-hidden shadow-sm header-card--${roleClass}`}
          >
            {/* Left border accent */}
            <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl header-card-accent"></div>

            <div className="flex items-center gap-5 pl-2">
              <span className="text-4xl lg:text-5xl flex-shrink-0">{roleConfig.icon}</span>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Dashboard</p>
                <h1
                  style={{
                    fontSize: '28px',
                    fontWeight: '800',
                    marginTop: '4px',
                    lineHeight: '1.1',
                  }}
                  className="header-card-title"
                >
                  {resolvedRoleName}
                </h1>
              </div>
            </div>

            <div className="text-right">
              <div className="text-base text-gray-600">
                {greeting()}, <span className="font-bold text-gray-900">{user?.shopName || 'User'}</span> 👋
              </div>
              <p className="text-sm text-gray-400 mt-1.5">Here's your inventory overview for today.</p>
            </div>
          </div>

          {/* CONTENT */}
          {children}

        </div>

      </main>

    </div>
  );
};

export default DashboardShell;
