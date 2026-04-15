import { useState } from 'react';
import { FiUser, FiLock, FiBell, FiSave } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import './Dashboard.css';
import './Settings.css';

const ROLE_LABELS = {
  shop_owner: 'Shop Owner', distributor: 'Distributor',
  wholesaler: 'Wholesaler', producer: 'Producer',
};

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

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
    e.preventDefault();
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
    e.preventDefault();
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
    e.preventDefault();
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

  const TABS = [
    { id: 'profile',       icon: <FiUser />,  label: 'Profile' },
    { id: 'security',      icon: <FiLock />,  label: 'Security' },
    { id: 'notifications', icon: <FiBell />,  label: 'Notifications' },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header">
          <h1>Settings</h1>
          <p>Manage your account and preferences.</p>
        </div>

        <div className="settings-layout">
          {/* Tabs */}
          <div className="settings-tabs card">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`settings-tab ${activeTab === t.id ? 'settings-tab--active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="settings-content card">
            {/* Profile */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSave}>
                <h2 className="settings-section-title">Profile Information</h2>

                <div className="settings-avatar-row">
                  <div className="settings-avatar">
                    {user?.shopName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="settings-avatar-name">{user?.shopName}</p>
                    <p className="settings-avatar-email">{user?.email}</p>
                    <span className="badge badge-primary" style={{ marginTop: 6 }}>
                      {ROLE_LABELS[user?.role] || 'Shop Owner'}
                    </span>
                  </div>
                </div>

                <div className="settings-form-grid">
                  <div className="form-group">
                    <label className="form-label">Shop Name</label>
                    <input
                      className="form-input"
                      value={profile.shopName}
                      onChange={e => setProfile(p => ({ ...p, shopName: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      className="form-input"
                      value={profile.phoneNumber}
                      onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" value={user?.email || ''} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <input className="form-input" value={ROLE_LABELS[user?.role] || ''} disabled />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                  {profileLoading ? <><span className="spinner" /> Saving...</> : <><FiSave /> Save Changes</>}
                </button>
              </form>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <form onSubmit={handlePasswordSave}>
                <h2 className="settings-section-title">Change Password</h2>
                <div className="settings-form-grid settings-form-grid--single">
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={passwords.currentPassword}
                      onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={passwords.newPassword}
                      onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={passwords.confirm}
                      onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                  {pwLoading ? <><span className="spinner" /> Updating...</> : <><FiLock /> Update Password</>}
                </button>
              </form>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <form onSubmit={handleNotifSave}>
                <h2 className="settings-section-title">Notification Preferences</h2>

                <div className="settings-toggle-list">
                  <div className="settings-toggle-row">
                    <div>
                      <p className="settings-toggle-label">Email Notifications</p>
                      <p className="settings-toggle-sub">Receive low stock & expiry alerts via email</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifPrefs.email}
                        onChange={e => setNotifPrefs(n => ({ ...n, email: e.target.checked }))}
                      />
                      <span className="toggle__track" />
                    </label>
                  </div>
                  <div className="settings-toggle-row">
                    <div>
                      <p className="settings-toggle-label">SMS Notifications</p>
                      <p className="settings-toggle-sub">Receive alerts via SMS</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifPrefs.sms}
                        onChange={e => setNotifPrefs(n => ({ ...n, sms: e.target.checked }))}
                      />
                      <span className="toggle__track" />
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 24, maxWidth: 280 }}>
                  <label className="form-label">Low Stock Threshold</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                  />
                  <p className="form-error" style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                    Alert when quantity falls below this number
                  </p>
                </div>

                <button type="submit" className="btn btn-primary" disabled={notifLoading}>
                  {notifLoading ? <><span className="spinner" /> Saving...</> : <><FiSave /> Save Preferences</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
