import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/layout/Sidebar';

const ProfileSkeleton = () => (
  <div className="profile-details-skeleton animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: 28 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 12, background: '#e2e8f0' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '50%', height: 24, background: '#e2e8f0', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ width: '40%', height: 16, background: '#e2e8f0', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  </div>
);

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid profile ID');
      setLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        const res = await api.get(`/profile/${id}`);
        if (mounted) {
          setProfile(res.data?.seller || res.data?.data || res.data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Profile fetch error:', err.response?.status, err.message);
        if (mounted) {
          setError(
            err.response?.status === 404
              ? 'This profile does not exist.'
              : 'Failed to load profile.'
          );
          setLoading(false);
        }
      }
    };

    const timeout = setTimeout(() => {
      if (mounted) {
        setError('Request timed out. Please go back and try again.');
        setLoading(false);
      }
    }, 8000);

    load().then(() => clearTimeout(timeout));

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <div style={{ padding: '24px' }}>
            <ProfileSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '12px' }}>
            <p style={{ fontSize: '16px', color: '#6b7280' }}>{error}</p>
            <button onClick={() => navigate('/connect')} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer', background: '#fff', fontSize: '14px' }}>
              ← Back to Connect
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const shopName = profile.shop_name || 'Verified Supplier';
  const role = profile.role || '';
  const city = profile.city;
  const state = profile.state;
  const locationStr = (city && state) ? `${city}, ${state}` : city || '';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="profile-details" style={{ padding: '24px' }}>
          <button
            onClick={() => navigate('/connect')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '14px', fontWeight: 600, padding: '8px 0', marginBottom: 20 }}
          >
            ← Back to Directory
          </button>

          <div className="profile-details__hero" style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div className="profile-details__info" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div className="profile-details__shop-icon" style={{ width: 72, height: 72, borderRadius: 12, background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 }}>
                {shopName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{shopName}</h2>
                <div className="profile-details__meta" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                  {role && <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{role}</span>}
                  {locationStr && <span style={{ color: '#6b7280', fontSize: 14 }}>📍 {locationStr}</span>}
                </div>
              </div>
            </div>
          </div>

          {profile.bio && (
            <div style={{ marginTop: 24, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 20 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700 }}>About</h3>
              <p style={{ margin: 0, color: '#374151', fontSize: 14, lineHeight: 1.6 }}>{profile.bio}</p>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {profile.email && (
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, padding: 16 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>Email</p>
                <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>{profile.email}</p>
              </div>
            )}
            {profile.created_at && (
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, padding: 16 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>Member Since</p>
                <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>{new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicProfile;
