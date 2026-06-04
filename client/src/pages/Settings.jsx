import { useState, useEffect } from 'react';
import { FiUser, FiLock, FiBell, FiSave, FiMoon, FiSun, FiDownload } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
  shop_owner: 'Shop Owner', distributor: 'Distributor',
  wholesaler: 'Wholesaler', producer: 'Producer',
};

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Profile form
  const [profile, setProfile] = useState({
    shopName: user?.shopName || '',
    phoneNumber: user?.phoneNumber || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState({
    email: user?.preferences?.notifications?.email ?? true,
    sms:   user?.preferences?.notifications?.sms   ?? true,
  });
  const [threshold, setThreshold] = useState(user?.preferences?.lowStockThreshold ?? 10);
  const [notifLoading, setNotifLoading] = useState(false);

  const handleProfileSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setProfileLoading(true);
    try {
      await api.put('/auth/profile', profile);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      return toast.error('Passwords do not match');
    }
    if (passwords.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setPwLoading(false);
    }
  };

  const handleNotifSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setNotifLoading(true);
    try {
      await api.put('/auth/profile', {
        preferences: {
          notifications: notifPrefs,
          lowStockThreshold: Number(threshold),
        },
      });
      toast.success('Preferences saved');
    } catch (err) {
      toast.error('Failed');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleGlobalSave = () => {
    if (activeTab === 'profile') handleProfileSave();
    else if (activeTab === 'security') handlePasswordSave();
    else if (activeTab === 'notifications') handleNotifSave();
  };

  const isSaving = profileLoading || pwLoading || notifLoading;

  const TABS = [
    { id: 'profile',       icon: <FiUser />,  label: 'Profile' },
    { id: 'security',      icon: <FiLock />,  label: 'Security' },
    { id: 'notifications', icon: <FiBell />,  label: 'Notifications' },
    { id: 'appearance',    icon: <FiMoon />,  label: 'Appearance' },
    { id: 'backup',        icon: <FiDownload />, label: 'Backup' },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main flex flex-col h-screen p-0 bg-white">
        {/* Page Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-200 shrink-0 bg-white">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and preferences.</p>
        </div>

        {/* Dual Column Layout */}
        <div className="flex flex-1 min-h-0 bg-gray-50">
          
          {/* Left Navigation */}
          <div className="w-64 border-r border-gray-200 p-4 shrink-0 overflow-y-auto bg-gray-50/50">
            <nav className="space-y-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === t.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-2xl">
                
                {/* Profile */}
                {activeTab === 'profile' && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
                      <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
                          {user?.shopName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">{user?.shopName}</p>
                          <p className="text-sm text-gray-500 mb-1">{user?.email}</p>
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold">
                            {ROLE_LABELS[user?.role] || 'Shop Owner'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-group mb-0">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Shop Name</label>
                        <input
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={profile.shopName}
                          onChange={e => setProfile(p => ({ ...p, shopName: e.target.value }))}
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                        <input
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={profile.phoneNumber}
                          onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                        <input className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" value={user?.email || ''} disabled />
                      </div>
                      <div className="form-group mb-0">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                        <input className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" value={ROLE_LABELS[user?.role] || ''} disabled />
                      </div>
                    </div>
                  </div>
                )}

                {/* Security */}
                {activeTab === 'security' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Change Password</h2>
                    <div className="form-group mb-0">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                      <input
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        type="password"
                        value={passwords.currentPassword}
                        onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                      <input
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        type="password"
                        value={passwords.newPassword}
                        onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        type="password"
                        value={passwords.confirm}
                        onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                {/* Notifications */}
                {activeTab === 'notifications' && (
                  <div className="space-y-8 animate-fade-in">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Email Notifications</p>
                          <p className="text-xs text-gray-500 mt-1">Receive low stock & expiry alerts via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={notifPrefs.email} onChange={e => setNotifPrefs(n => ({ ...n, email: e.target.checked }))} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">SMS Notifications</p>
                          <p className="text-xs text-gray-500 mt-1">Receive alerts via SMS</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={notifPrefs.sms} onChange={e => setNotifPrefs(n => ({ ...n, sms: e.target.checked }))} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Low Stock Threshold</label>
                      <input
                        className="w-full max-w-[200px] p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        type="number"
                        min="1"
                        value={threshold}
                        onChange={e => setThreshold(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Alert when quantity falls below this number
                      </p>
                    </div>
                  </div>
                )}

                {/* Backup */}
                {activeTab === 'backup' && (
                  <div className="animate-fade-in">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Data Backup</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Create a backup of your important data (products, orders, customers, expenses, activity logs).
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        try {
                          const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                          const res = await fetch(`${API}/backup`, { method: 'POST', credentials: 'include' });
                          if (!res.ok) throw new Error('Backup failed');
                          const data = await res.json();
                          toast.success(`Backup created: ${data.filename}`);
                        } catch (err) {
                          toast.error(err.message);
                        }
                      }}
                    >
                      <FiDownload /> Create Backup
                    </button>
                  </div>
                )}

                {/* Appearance */}
                {activeTab === 'appearance' && (
                  <div className="animate-fade-in">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Appearance</h2>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">Dark Mode</p>
                        <p className="text-xs text-gray-500 mt-1">Switch between light and dark theme</p>
                      </div>
                      <button
                        className={`btn ${dark ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setDark(d => !d)}
                      >
                        {dark ? <><FiSun /> Light Mode</> : <><FiMoon /> Dark Mode</>}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Sticky Footer */}
            {['profile', 'security', 'notifications'].includes(activeTab) && (
              <div className="shrink-0 border-t border-gray-200 bg-white p-4 px-8 flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                <button 
                  type="button" 
                  className="btn btn-primary px-8"
                  disabled={isSaving}
                  onClick={handleGlobalSave}
                >
                  {isSaving ? <><span className="spinner" /> Saving...</> : <><FiSave /> Save Changes</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
