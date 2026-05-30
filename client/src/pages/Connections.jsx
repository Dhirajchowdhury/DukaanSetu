import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import { FiMessageSquare, FiUser, FiMapPin, FiMap, FiSmile } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Connections.css';

const Connections = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/connections');
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const formatRoleLabel = (role) => {
    const roles = {
      distributor: 'Distributor',
      wholesaler: 'Wholesaler',
      producer: 'Producer',
      shop_owner: 'Shop Owner',
    };
    return roles[role] || role;
  };

  const handleMessageUser = async (otherUserId) => {
    toast.loading('Initiating chat...', { id: 'init-chat' });
    try {
      const { data } = await api.post('/conversations', { otherUserId });
      toast.success('Conversation loaded', { id: 'init-chat' });
      // Redirect to /connect tab 'chat' with selected conversation ID
      navigate('/connect', { 
        state: { 
          activeTab: 'chat', 
          activeConv: data.conversation 
        } 
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to initiate chat', { id: 'init-chat' });
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main connections-page-main">
        <div className="connections-header">
          <div>
            <h1 className="connections-title">My B2B Network</h1>
            <p className="connections-subtitle">Interact and trade with your connected wholesalers, distributors, and partners.</p>
          </div>
          <button 
            onClick={() => navigate('/connect')}
            className="btn btn-primary connections-browse-btn"
          >
            Browse Supplier Directory
          </button>
        </div>

        {loading ? (
          <div className="connections-loading">
            <div className="spinner spinner-lg" />
            <p>Loading your B2B network...</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="connections-empty card animate-fade-in">
            <div className="empty-state-icon">🤝</div>
            <h3>Build Your Connections</h3>
            <p>You haven't established any business connections yet. Visit the Discovery directory to connect instantly with suppliers.</p>
            <button 
              onClick={() => navigate('/connect')}
              className="btn btn-primary"
              style={{ marginTop: 16 }}
            >
              Discover Sellers
            </button>
          </div>
        ) : (
          <div className="connections-grid animate-fade-in">
            {(connections || []).map((conn) => {
              const { otherUser } = conn;
              if (!otherUser) return null; // Enforce safe rendering guard
              const hasCoords = otherUser.latitude != null && otherUser.longitude != null;
              
              return (
                <div key={conn.id} className="connection-card">
                  <div className="connection-card-avatar">
                    {otherUser.shop_name?.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="connection-card-content">
                    <h3 className="connection-card-name">{otherUser.shop_name}</h3>
                    <span className="badge badge-accent connection-card-role">
                      {formatRoleLabel(otherUser.role)}
                    </span>
                    
                    <div className="connection-card-location">
                      <FiMapPin className="text-primary flex-shrink-0" />
                      <span className="line-clamp-1">
                        {(otherUser.city && otherUser.state && `${otherUser.city}, ${otherUser.state}`) ||
                          otherUser.city ||
                          "🌍 Pan-India supplier"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="connection-card-actions">
                    <button 
                      onClick={() => handleMessageUser(otherUser.id)}
                      className="btn btn-primary btn-sm btn-icon"
                      title="Send Direct Message"
                    >
                      <FiMessageSquare /> Message
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (!otherUser?.id) return;
                        console.log(`[DEBUG] Connection profile navigation - otherUser.id before navigation:`, otherUser.id);
                        navigate(`/profile/${otherUser.id}`);
                      }}
                      className="btn btn-secondary btn-sm btn-icon"
                      title="View Seller Profile"
                    >
                      <FiUser /> Profile
                    </button>
                    
                    <a
                      href={hasCoords ? `https://www.google.com/maps/search/?api=1&query=${otherUser.latitude},${otherUser.longitude}` : '#'}
                      target={hasCoords ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      className={`btn btn-secondary btn-sm btn-icon ${!hasCoords ? 'disabled-map-btn' : ''}`}
                      onClick={(e) => !hasCoords && e.preventDefault()}
                      title={hasCoords ? 'View exact shop location' : 'Location details unavailable'}
                    >
                      <FiMap /> {hasCoords ? 'View Location' : 'No Location'}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Connections;
