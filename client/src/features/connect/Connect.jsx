import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  FiSearch, FiMapPin, FiPackage, FiShoppingCart, FiMessageSquare, 
  FiCompass, FiNavigation, FiMap, FiUser, FiSend, FiX, 
  FiChevronRight, FiInfo, FiArrowLeft, FiClock, FiMaximize, FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Connect.css';

const ConnectFeature = () => {
  const { user, checkAuth } = useAuth();
  const { id: routeSellerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Tabs: 'marketplace' | 'discovery' | 'connections' | 'chat'
  const [activeTab, setActiveTab] = useState('discovery');
  
  // Geolocation states
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);

  // Marketplace states (existing tab)
  const [marketplaceProducts, setMarketplaceProducts] = useState([]);
  const [mLoading, setMLoading] = useState(true);
  const [mSearch, setMSearch] = useState('');
  
  // Discovery (profiles) states
  const [profiles, setProfiles] = useState([]);
  const [dLoading, setDLoading] = useState(true);
  const [dSearch, setDSearch] = useState('');
  const [dLocation, setDLocation] = useState('');
  const [dRole, setDRole] = useState('');
  const [dMinPrice, setDMinPrice] = useState('');
  const [dMaxPrice, setDMaxPrice] = useState('');
  const [dSortBy, setDSortBy] = useState('nearest'); // 'nearest' | 'lowest_price' | ''
  const [dMaxDistance, setDMaxDistance] = useState(''); // '' | '5' | '10'
  const [dPage, setDPage] = useState(1);
  const [dPages, setDPages] = useState(1);

  // Connections states
  const [connections, setConnections] = useState([]);
  const [connLoading, setConnLoading] = useState(true);

  // Hover Preview states
  const [hoveredProducts, setHoveredProducts] = useState({});
  const handleMouseEnter = async (userId) => {
    if (hoveredProducts[userId]) return; // Cache hit
    try {
      const { data } = await api.get(`/products/top/${userId}`);
      setHoveredProducts(prev => ({ ...prev, [userId]: data.products || [] }));
    } catch (error) {
      console.error('Failed to fetch top products for hover preview:', error);
    }
  };


  // Single Profile View state
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerListings, setSellerListings] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Chat System states
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // selected conversation object
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatsLoading, setChatsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Connect Loading state
  const [connectingUsers, setConnectingUsers] = useState({});

  // Inquiry Modal states
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [selectedInquiryProduct, setSelectedInquiryProduct] = useState(null);
  const [inquiryQty, setInquiryQty] = useState(1);
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);

  // Order Modal states
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderProduct, setSelectedOrderProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderDeliveryLocation, setOrderDeliveryLocation] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync routing and state (for redirection from connections/orders pages)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      if (location.state.activeConv) {
        setActiveConv(location.state.activeConv);
        fetchMessages(location.state.activeConv.id, true);
      }
      // Clean up state on navigation history so it doesn't loop
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  // 1. Initialise and load tab data
  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchMarketplaceProducts();
    } else if (activeTab === 'discovery') {
      if (!selectedSellerId) {
        fetchDiscoverProfiles();
      }
    } else if (activeTab === 'chat') {
      fetchConversations();
    } else if (activeTab === 'connections') {
      fetchConnections();
    }
  }, [activeTab, dSearch, dLocation, dRole, dMinPrice, dMaxPrice, dSortBy, dPage, dMaxDistance, selectedSellerId]);

  // Chat Polling Interval
  useEffect(() => {
    if (activeTab !== 'chat' || !activeConv) return;
    
    // Fetch immediately
    fetchMessages(activeConv.id, false);
    
    // Poll every 3 seconds
    const interval = setInterval(() => {
      fetchMessages(activeConv.id, false);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab, activeConv]);

  // Connections Fetching & Updating Handlers
  const fetchConnections = async () => {
    setConnLoading(true);
    try {
      const { data } = await api.get('/connections');
      setConnections(data.connections || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load connections');
    } finally {
      setConnLoading(false);
    }
  };

  const handleUpdateConnection = async (connId, status) => {
    const loadingToastId = toast.loading(`${status === 'accepted' ? 'Accepting' : 'Rejecting'} connection...`);
    try {
      await api.put(`/connections/${connId}`, { status });
      toast.success(`Connection request ${status === 'accepted' ? 'accepted' : 'rejected'}!`, { id: loadingToastId });
      fetchConnections();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update connection', { id: loadingToastId });
    }
  };

  // ── Geolocation Operations ──
  const detectGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setDetectingLoc(true);
    toast.loading('Requesting GPS coordinates...', { id: 'gps' });
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        
        toast.loading('Resolving address...', { id: 'gps' });
        try {
          const { data } = await api.post('/profile/reverse-geocode', { lat, lng });
          const loc = data.location || {};
          setAddress(loc.address || '');
          setCity(loc.city || '');
          setStateVal(loc.state || '');
          toast.success('Address auto-resolved successfully!', { id: 'gps' });
        } catch (err) {
          console.error(err);
          toast.error('GPS coordinates detected but address lookup failed', { id: 'gps' });
        }
        setDetectingLoc(false);
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error('Failed to get GPS location.', { id: 'gps' });
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!latitude || !longitude) {
      toast.error('Please click Auto-Detect via GPS first');
      return;
    }
    if (!address.trim()) {
      toast.error('Business address is required');
      return;
    }

    setSavingLoc(true);
    try {
      await api.put('/profile/location', {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address.trim(),
        locationName: city ? `${city}, ${stateVal}` : address.trim(),
        city: city || null,
        state: stateVal || null,
      });

      toast.success('Location updated successfully!');
      setShowLocationForm(false);
      
      // Reload user profile in context
      await checkAuth();
      
      // Reload discovery list
      if (activeTab === 'discovery') {
        fetchDiscoverProfiles();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update location');
    } finally {
      setSavingLoc(false);
    }
  };

  // ── Wholesaler Marketplace Products (Existing View) ──
  const fetchMarketplaceProducts = async () => {
    setMLoading(true);
    try {
      const { data } = await api.get('/connect', {
        params: { search: mSearch }
      });
      setMarketplaceProducts(data.products || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load marketplace products');
    } finally {
      setMLoading(false);
    }
  };

  const handleConnectUser = async (e, otherUserId) => {
    if (e) e.stopPropagation();
    setConnectingUsers(prev => ({ ...prev, [otherUserId]: true }));
    const loadingToastId = toast.loading('Connecting...');
    try {
      await api.post(`/connections/${otherUserId}`);
      toast.success('Connected successfully!', { id: loadingToastId });
      
      // Update UI instantly
      setProfiles(prev => prev.map(p => {
        const pId = p.id || p.wholesaler?.id;
        if (pId === otherUserId) {
          return { ...p, isConnected: true };
        }
        return p;
      }));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to connect', { id: loadingToastId });
    } finally {
      setConnectingUsers(prev => ({ ...prev, [otherUserId]: false }));
    }
  };

  const handleConnectProfileUser = async (e, otherUserId) => {
    await handleConnectUser(e, otherUserId);
    setSellerProfile(prev => prev ? { ...prev, isConnected: true } : null);
  };

  const triggerOrderModal = (e, product) => {
    if (e) e.stopPropagation();
    setSelectedOrderProduct(product);
    setOrderQty(product.moq || 1);
    setOrderDeliveryLocation(user?.address || '');
    setOrderNotes('');
    setShowOrderModal(true);
  };

  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderProduct) return;

    if (selectedOrderProduct.moq && orderQty < selectedOrderProduct.moq) {
      toast.error(`Minimum order quantity not met. MOQ is ${selectedOrderProduct.moq}`);
      return;
    }

    if (orderQty > selectedOrderProduct.stock_available) {
      toast.error(`Order quantity exceeds available stock of ${selectedOrderProduct.stock_available}`);
      return;
    }

    setPlacingOrder(true);
    const loadingToastId = toast.loading('Placing order...');
    try {
      await api.post('/orders', {
        productId: selectedOrderProduct.id,
        quantity: parseInt(orderQty),
        deliveryLocation: orderDeliveryLocation,
        notes: orderNotes
      });
      toast.success('Order placed successfully!', { id: loadingToastId });
      setShowOrderModal(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to place order', { id: loadingToastId });
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Profile Discovery Feed ──
  const fetchDiscoverProfiles = async () => {
    setDLoading(true);
    try {
      const { data } = await api.get('/profile/discover', {
        params: {
          search: dSearch,
          category: '',
          role: dRole,
          minPrice: dMinPrice,
          maxPrice: dMaxPrice,
          location: dLocation,
          sortBy: dSortBy,
          page: dPage,
          limit: 12,
          maxDistance: dMaxDistance
        }
      });
      setProfiles(data.profiles || []);
      setDPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load seller discovery profiles');
    } finally {
      setDLoading(false);
    }
  };

  // ── Single Seller Profile details ──
  const viewSellerProfile = async (userId) => {
    setProfileLoading(true);
    setSelectedSellerId(userId);
    try {
      const { data } = await api.get(`/profile/${userId}`);
      setSellerProfile(data.seller);
      setSellerListings(data.listings || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load seller details');
      setSelectedSellerId(null);
      navigate('/connect');
    } finally {
      setProfileLoading(false);
    }
  };

  // Sync selectedSellerId with URL route param
  useEffect(() => {
    if (routeSellerId) {
      viewSellerProfile(routeSellerId);
    } else {
      setSelectedSellerId(null);
      setSellerProfile(null);
      setSellerListings([]);
    }
  }, [routeSellerId]);

  // ── Chat & Inquiry CTAs ──
  const startChatWithSeller = async (sellerId) => {
    toast.loading('Initiating chat...', { id: 'chat' });
    try {
      const { data } = await api.post('/chat/conversations', { otherUserId: sellerId });
      toast.success('Conversation opened', { id: 'chat' });
      
      // Store conversation
      const conversation = data.conversation;
      
      // Select it and go to chat tab
      setActiveConv(conversation);
      setActiveTab('chat');
      setSelectedSellerId(null); // close profile page
    } catch (error) {
      console.error(error);
      toast.error('Failed to start conversation', { id: 'chat' });
    }
  };

  // ── Active Chat Messaging Operations ──
  const fetchConversations = async () => {
    setChatsLoading(true);
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.conversations || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load chats');
    } finally {
      setChatsLoading(false);
    }
  };

  const fetchMessages = async (convId, showSpinner = true) => {
    if (showSpinner) setMessagesLoading(true);
    try {
      const { data } = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(data.messages || []);
    } catch (error) {
      console.error(error);
    } finally {
      if (showSpinner) setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // optimistic UI clear

    try {
      const { data } = await api.post(`/chat/conversations/${activeConv.id}/messages`, {
        message: messageText
      });
      // Append sent message locally
      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      toast.error('Failed to send message');
      setNewMessage(messageText); // restore text
    }
  };

  // Helper: Find chat partner details
  const getChatPartner = (conv) => {
    if (!conv || !conv.user1 || !conv.user2) return null;
    return conv.user1.id === user?.id ? conv.user2 : conv.user1;
  };

  // ── Inquiry System Operations ──
  const triggerInquiryModal = (product) => {
    setSelectedInquiryProduct(product);
    setInquiryQty(product.moq || 1);
    setInquiryMsg(`Hi, I'm interested in purchasing ${product.product_name}. Please share availability, lead times, and shipping terms to our location.`);
    setShowInquiryModal(true);
  };

  const handleSendInquirySubmit = async (e) => {
    e.preventDefault();
    if (!selectedInquiryProduct) return;

    setSendingInquiry(true);
    try {
      await api.post('/inquiries', {
        productId: selectedInquiryProduct.id,
        quantity: parseInt(inquiryQty),
        message: inquiryMsg,
      });

      toast.success('Inquiry sent successfully! The seller has been notified.');
      setShowInquiryModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send inquiry');
    } finally {
      setSendingInquiry(false);
    }
  };

  // ── Render Helpers ──
  const formatRoleLabel = (role) => {
    const roles = {
      distributor: 'Distributor',
      wholesaler: 'Wholesaler',
      producer: 'Producer',
      shop_owner: 'Shop Owner'
    };
    return roles[role] || role;
  };

  return (
    <div className="connect-container">
      
      {/* 📍 Geolocation Prompt / Banner */}
      {user && (!user.latitude || !user.longitude) && !showLocationForm && (
        <div className="location-banner">
          <div className="location-banner__info">
            <span className="location-banner__icon">📍</span>
            <div>
              <h3 className="location-banner__title">Complete Your Business Location</h3>
              <p className="location-banner__desc">
                Provide your geolocation to enable distance calculations, identify the nearest suppliers, and navigate directions easily.
              </p>
            </div>
          </div>
          <div className="location-banner__actions">
            <button 
              onClick={detectGeolocation} 
              disabled={detectingLoc}
              className="btn btn-primary btn-sm"
            >
              {detectingLoc ? 'Detecting...' : 'Use Current GPS'}
            </button>
            <button 
              onClick={() => {
                setLatitude(user.latitude || '');
                setLongitude(user.longitude || '');
                setAddress(user.address || '');
                setShowLocationForm(true);
              }}
              className="btn btn-secondary btn-sm"
            >
              Enter Manually
            </button>
          </div>
        </div>
      )}

      {/* Geolocation Input Modal Form */}
      {showLocationForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>📍 Update Business Location</h2>
              <button className="btn-ghost" onClick={() => setShowLocationForm(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSaveLocation}>
              <div className="modal-body">
                <div className="location-form">
                  {/* Button to detect GPS coordinates */}
                  <button 
                    type="button" 
                    onClick={detectGeolocation} 
                    className="btn btn-primary btn-block btn-sm"
                    style={{ gap: 6, marginBottom: 20 }}
                  >
                    <FiNavigation /> Auto-Detect via GPS
                  </button>

                  <div className="form-group">
                    <label className="form-label">Business Display Address *</label>
                    <textarea 
                      className="form-textarea" 
                      rows="3"
                      required
                      placeholder="e.g. Warehouse A, Kolkata, West Bengal, India" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLocationForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingLoc}>
                  {savingLoc ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1>Connection & Discovery</h1>
          <p>Discover nearby Wholesalers and Producers, manage connections, and coordinate via inquiries or real-time chat.</p>
        </div>
        
        {/* Settings button to update location anytime */}
        {user && (
          <button 
            onClick={() => {
              setLatitude(user.latitude || '');
              setLongitude(user.longitude || '');
              setAddress(user.address || '');
              setCity(user.city || '');
              setStateVal(user.state || '');
              setShowLocationForm(true);
            }} 
            className="btn btn-secondary btn-sm"
            style={{ gap: 6 }}
          >
            <FiMapPin className="text-primary" /> 📍 {user.location_name || user.city || 'Set Location'}
          </button>
        )}
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="connect-tabs">
        <button 
          className={`connect-tab-btn ${activeTab === 'discovery' ? 'connect-tab-btn--active' : ''}`}
          onClick={() => { setActiveTab('discovery'); setSelectedSellerId(null); }}
        >
          <FiCompass /> Discover Sellers
        </button>
        <button 
          className={`connect-tab-btn ${activeTab === 'marketplace' ? 'connect-tab-btn--active' : ''}`}
          onClick={() => { setActiveTab('marketplace'); setSelectedSellerId(null); }}
        >
          <FiPackage /> Product Catalog
        </button>
        <button 
          className={`connect-tab-btn ${activeTab === 'connections' ? 'connect-tab-btn--active' : ''}`}
          onClick={() => { setActiveTab('connections'); setSelectedSellerId(null); }}
        >
          <FiUser /> My Connections
        </button>
        <button 
          className={`connect-tab-btn ${activeTab === 'chat' ? 'connect-tab-btn--active' : ''}`}
          onClick={() => { setActiveTab('chat'); setSelectedSellerId(null); }}
        >
          <FiMessageSquare /> Conversations
        </button>
      </div>

      {/* ── Tab View Content ── */}

      {/* 1. SELLER DISCOVERY TAB */}
      {activeTab === 'discovery' && !selectedSellerId && (
        <div>
          {/* Discovery Filter Panel */}
          <div className="filter-panel">
            <div className="filter-grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Search products/categories</label>
                <div className="search-wrapper">
                  <FiSearch className="search-input-icon" />
                  <input 
                    type="text" 
                    placeholder="Search name or category..." 
                    className="form-input search-text-input" 
                    value={dSearch}
                    onChange={(e) => { setDSearch(e.target.value); setDPage(1); }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Location</label>
                <input 
                  type="text" 
                  placeholder="Filter by city/address..." 
                  className="form-input" 
                  value={dLocation}
                  onChange={(e) => { setDLocation(e.target.value); setDPage(1); }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Supplier Type</label>
                <select 
                  className="form-select" 
                  value={dRole}
                  onChange={(e) => { setDRole(e.target.value); setDPage(1); }}
                >
                  <option value="">All Roles</option>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="distributor">Distributor</option>
                  <option value="producer">Producer</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Sort By</label>
                <select 
                  className="form-select" 
                  value={dSortBy}
                  onChange={(e) => { setDSortBy(e.target.value); setDPage(1); }}
                >
                  <option value="nearest">Nearest First</option>
                  <option value="lowest_price">Lowest Product Price</option>
                  <option value="">Alphabetical</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <button 
                  onClick={() => {
                    setDSearch('');
                    setDLocation('');
                    setDRole('');
                    setDMinPrice('');
                    setDMaxPrice('');
                    setDSortBy('nearest');
                    setDMaxDistance('');
                    setDPage(1);
                  }}
                  className="btn btn-secondary btn-block btn-sm"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Quick Proximity Filters */}
            <div className="quick-proximity-filters" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Proximity Filter:</span>
              <button 
                type="button"
                className={`btn btn-sm ${dMaxDistance === '5' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setDMaxDistance(dMaxDistance === '5' ? '' : '5'); setDPage(1); }}
                style={{ borderRadius: '20px', fontSize: '12px', padding: '4px 12px' }}
              >
                📍 Within 5 km
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${dMaxDistance === '10' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setDMaxDistance(dMaxDistance === '10' ? '' : '10'); setDPage(1); }}
                style={{ borderRadius: '20px', fontSize: '12px', padding: '4px 12px' }}
              >
                📍 Within 10 km
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${dMaxDistance === '' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setDMaxDistance(''); setDPage(1); }}
                style={{ borderRadius: '20px', fontSize: '12px', padding: '4px 12px' }}
              >
                🌍 All
              </button>
            </div>
          </div>

          {/* Directory Listings */}
          {dLoading ? (
            <div className="loading-center">
              <div className="spinner spinner-lg" />
              <p>Loading seller directory…</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">🔍</div>
              <h3>No suppliers found</h3>
              <p>Try clearing filters or search keywords to discover more sellers.</p>
            </div>
          ) : (
            <div>
              <div className="seller-grid">
                {(() => {
                  const activeDistances = profiles.map(p => p.distance_km ?? p.distance).filter(d => d !== null && d > 0);
                  const minDistance = activeDistances.length > 0 ? Math.min(...activeDistances) : Infinity;

                  const activePrices = profiles.map(p => p.minPrice ?? p.min_price).filter(p => p > 0);
                  const overallMinPrice = activePrices.length > 0 ? Math.min(...activePrices) : Infinity;

                  const activeCounts = profiles.map(p => p.total_products !== undefined ? p.total_products : (p.productCount !== undefined ? p.productCount : 0));
                  const maxCount = activeCounts.length > 0 ? Math.max(...activeCounts) : 0;

                  return profiles.map((profile) => {
                    const id = profile.id || profile.wholesaler?.id;
                    const shopName = profile.shop_name || profile.wholesaler?.shop_name || 'Verified Supplier';
                    const role = profile.role || profile.wholesaler?.role || '';
                    const addressVal = profile.address || profile.wholesaler?.address || 'Pan India';
                    const totalProducts = profile.total_products !== undefined ? profile.total_products : (profile.productCount !== undefined ? profile.productCount : 0);
                    const minPrice = profile.min_price !== undefined ? profile.min_price : (profile.minPrice !== undefined ? profile.minPrice : 0);
                    const maxPrice = profile.max_price !== undefined ? profile.max_price : (profile.maxPrice !== undefined ? profile.maxPrice : 0);
                    const distance = profile.distance_km !== undefined ? profile.distance_km : (profile.distance !== undefined ? profile.distance : null);
                    const topProducts = hoveredProducts[id] || profile.topProducts || [];

                    const isConnected = profile.isConnected;
                    const sLat = profile.wholesaler?.latitude ?? profile.latitude;
                    const sLng = profile.wholesaler?.longitude ?? profile.longitude;
                    const hasS = sLat != null && sLng != null;

                    // Smart Tags Matching
                    const isClosest = distance !== null && distance > 0 && distance === minDistance;
                    const isBestPrice = minPrice > 0 && minPrice === overallMinPrice;
                    const isTrending = totalProducts > 0 && totalProducts === maxCount;

                    const shortLoc = hasS
                      ? ((profile.city && profile.state) ? `${profile.city}, ${profile.state}` : (profile.location_name || profile.wholesaler?.location_name || addressVal))
                      : "🌍 Pan-India supplier";

                    return (
                      <div 
                        key={id} 
                        className="profile-card"
                        onMouseEnter={() => handleMouseEnter(id)}
                      >
                        <div className="profile-card-inner">
                          {/* Front Side */}
                          <div className="profile-card-front" onClick={() => navigate(`/connect/profile/${id}`)}>
                            {/* Smart Badges Row */}
                            {(isClosest || isBestPrice || isTrending) && (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {isClosest && (
                                  <span className="badge badge-success" style={{ gap: 2 }}>
                                    🟢 Closest
                                  </span>
                                )}
                                {isBestPrice && (
                                  <span className="badge badge-primary" style={{ gap: 2 }}>
                                    💰 Best Price
                                  </span>
                                )}
                                {isTrending && (
                                  <span className="badge badge-warning" style={{ gap: 2 }}>
                                    🔥 Trending
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="profile-card__header header">
                              <div className="profile-card__avatar avatar">
                                {shopName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="profile-card__title" style={{ margin: 0 }}>{shopName}</h3>
                                <p className="profile-card__role" style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                                  <span className="badge badge-accent" style={{ padding: '2px 8px', fontSize: 10 }}>
                                    {formatRoleLabel(role)}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="profile-card__body body" style={{ marginTop: 12, flex: 1 }}>
                              <p className="profile-card__meta" style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>📍</span> <span className="line-clamp-1" title={shortLoc}>{shortLoc}</span>
                              </p>
                              <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>📦</span> <span>{totalProducts > 0 ? `${totalProducts} products` : "No products yet"}</span>
                              </p>
                              <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>💰</span> <span>{totalProducts > 0 ? `₹${minPrice} - ₹${maxPrice}` : "N/A"}</span>
                              </p>
                              {distance !== null && (
                                <div style={{ marginTop: 6 }}>
                                  <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    📍 {distance} km away
                                  </span>
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 14 }}>
                              {isConnected ? (
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ flex: 1, justifyContent: "center", gap: 4 }}
                                  onClick={(e) => { e.stopPropagation(); startChatWithSeller(id); }}
                                >
                                  💬 Message
                                </button>
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ flex: 1, justifyContent: "center", gap: 4 }}
                                  onClick={(e) => handleConnectUser(e, id)}
                                  disabled={connectingUsers[id]}
                                >
                                  {connectingUsers[id] ? (
                                    <>
                                      <span className="spinner spinner-xs" /> Connecting...
                                    </>
                                  ) : (
                                    <>🔵 Connect</>
                                  )}
                                </button>
                              )}
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1, justifyContent: "center" }}
                                onClick={(e) => { e.stopPropagation(); navigate(`/connect/profile/${id}`); }}
                              >
                                View Profile
                              </button>
                            </div>
                          </div>

                          {/* Back Side */}
                          <div className="profile-card-back">
                            <h4 className="profile-card__back-title">Top Products</h4>
                            <div className="profile-card__back-products">
                              {topProducts.length > 0 ? (
                                topProducts.map(prod => (
                                  <div key={prod.id} className="profile-card__hover-item">
                                    <span className="profile-card__hover-name">{prod.product_name}</span>
                                    <span className="profile-card__hover-price">₹{prod.price_per_unit}</span>
                                  </div>
                                ))
                              ) : (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0 0', textAlign: 'center' }}>No products yet</p>
                              )}
                            </div>

                            <div className="profile-card__back-actions" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
                              <a
                                href={hasS ? `https://www.google.com/maps/search/?api=1&query=${sLat},${sLng}` : '#'}
                                target={hasS ? '_blank' : '_self'}
                                rel="noopener noreferrer"
                                className={`btn btn-secondary btn-sm ${!hasS ? 'disabled-map-btn' : ''}`}
                                style={{ width: "100%", justifyContent: "center", textDecoration: 'none', gap: 6 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!hasS) e.preventDefault();
                                }}
                                title={hasS ? "View exact shop location" : "Coordinates unavailable"}
                              >
                                📍 {hasS ? "View Location" : "No Location"}
                              </a>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ width: "100%", justifyContent: "center" }}
                                onClick={(e) => { e.stopPropagation(); startChatWithSeller(id); }}
                              >
                                💬 Message
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Pagination controls */}
              {dPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, gap: 8 }}>
                  <button 
                    disabled={dPage <= 1} 
                    onClick={() => setDPage(dPage - 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Previous
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: 600, fontSize: 14 }}>
                    Page {dPage} of {dPages}
                  </span>
                  <button 
                    disabled={dPage >= dPages} 
                    onClick={() => setDPage(dPage + 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. SINGLE PROFILE DETAIL VIEW */}
      {activeTab === 'discovery' && selectedSellerId && (
        <div className="profile-details">
          <div className="profile-details__back" onClick={() => setSelectedSellerId(null)}>
            <FiArrowLeft /> Back to Directory
          </div>

          {profileLoading ? (
            <div className="loading-center">
              <div className="spinner spinner-lg" />
              <p>Fetching profile details…</p>
            </div>
          ) : !sellerProfile ? (
            <div className="card empty-state">
              <h3>Profile not found</h3>
            </div>
          ) : (
            <div>
              {/* Profile Hero Header Card */}
              <div className="profile-details__hero">
                <div className="profile-details__info">
                  <div className="profile-details__shop-icon">
                    {sellerProfile.shop_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="profile-details__name">{sellerProfile.shop_name}</h2>
                    <div className="profile-details__meta">
                      <span className="badge badge-accent">
                        {formatRoleLabel(sellerProfile.role)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FiMapPin className="text-primary" /> {sellerProfile.latitude != null && sellerProfile.longitude != null ? ((sellerProfile.city && sellerProfile.state) ? `${sellerProfile.city}, ${sellerProfile.state}` : (sellerProfile.location_name || sellerProfile.address || 'Pan India')) : "🌍 Pan-India supplier"}
                      </span>
                      {/* Show maps verified status */}
                      {sellerProfile.latitude && sellerProfile.longitude && (
                        <>
                          <span>•</span>
                          <span className="badge badge-primary font-bold">
                            📍 Verified Location
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="profile-details__actions">
                  {/* View on Map CTA */}
                  {sellerProfile.latitude && sellerProfile.longitude ? (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${sellerProfile.latitude},${sellerProfile.longitude}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none', gap: 6 }}
                      title="View exact shop location"
                    >
                      <FiMap /> View Location
                    </a>
                  ) : (
                    <div style={{ display: 'inline-block', position: 'relative' }} title="Seller's GPS coordinates are unset">
                      <button 
                        disabled
                        className="btn btn-secondary"
                        style={{ opacity: 0.5, cursor: 'not-allowed', gap: 6 }}
                      >
                        <FiMap /> View Location (Disabled) <FiInfo style={{ marginLeft: 4 }} />
                      </button>
                    </div>
                  )}

                  {/* Message / Connect CTA */}
                  {sellerProfile.isConnected ? (
                    <button 
                      onClick={() => startChatWithSeller(sellerProfile.id)}
                      className="btn btn-primary"
                      style={{ gap: 6 }}
                    >
                      <FiMessageSquare /> Message
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => handleConnectProfileUser(e, sellerProfile.id)}
                      className="btn btn-primary"
                      style={{ gap: 6 }}
                      disabled={connectingUsers[sellerProfile.id]}
                    >
                      {connectingUsers[sellerProfile.id] ? (
                        <>
                          <span className="spinner spinner-xs" /> Connecting...
                        </>
                      ) : (
                        <>🔵 Connect</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Products by this user */}
              <h3 className="profile-details__subtitle">
                <FiPackage className="text-primary" /> Available Products ({sellerListings.length})
              </h3>

              {sellerListings.length === 0 ? (
                <div className="card empty-state">
                  <p>This seller hasn't listed any wholesale products yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sellerListings.map((product) => (
                    <div key={product.id} className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between" style={{ minHeight: "220px", borderRadius: "16px" }}>
                      {/* Top: Name, Category, Location */}
                      <div className="mb-3">
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <h3 className="text-sm font-bold text-gray-900 line-clamp-2" style={{ margin: 0 }}>{product.product_name}</h3>
                          <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-teal-100 flex-shrink-0">
                            {product.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1" style={{ margin: 0 }}>
                          <FiMapPin className="text-teal-500" /> {product.location || 'Pan India'}
                        </p>
                      </div>

                      {/* Middle: Price, Unit, MOQ */}
                      <div className="mb-4 pt-3 border-t border-gray-50 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold" style={{ margin: 0 }}>Price</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-indigo-600">₹{product.price_per_unit}</span>
                            <span className="text-xs text-gray-400 font-medium">/ {product.unit || 'unit'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-bold border border-indigo-100">
                            MOQ: {product.moq} {product.unit || 'units'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom: Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
                        <button 
                          onClick={() => triggerInquiryModal(product)}
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Inquire
                        </button>
                        <button 
                          onClick={(e) => triggerOrderModal(e, product)}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. PRODUCT CATALOG TAB (EXISTING INTERFACE) */}
      {activeTab === 'marketplace' && (
        <div>
          {/* Search bar */}
          <div className="relative mb-8 max-w-2xl" style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <FiSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search for marketplace products or categories..."
                className="form-input"
                style={{ paddingLeft: 44 }}
                value={mSearch}
                onChange={(e) => setMSearch(e.target.value)}
              />
            </div>
            <button onClick={fetchMarketplaceProducts} className="btn btn-primary">Search</button>
          </div>

          {mLoading ? (
            <div className="loading-center">
              <div className="spinner spinner-lg" />
              <p>Loading products catalog…</p>
            </div>
          ) : marketplaceProducts.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">📦</div>
              <h3>No products found</h3>
              <p>Try searching for different items or categories.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {marketplaceProducts.map((product) => (
                <div key={product.id} className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between" style={{ minHeight: "240px", borderRadius: "16px" }}>
                  {/* Top: Name, Category, Location */}
                  <div className="mb-3">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2" style={{ margin: 0 }}>{product.product_name}</h3>
                      <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-teal-100 flex-shrink-0">
                        {product.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1" style={{ margin: 0 }}>
                      <FiMapPin className="text-teal-500" /> {product.location || 'Pan India'}
                    </p>
                  </div>

                  {/* Middle: Price, Unit, MOQ */}
                  <div className="mb-4 pt-3 border-t border-gray-50 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold" style={{ margin: 0 }}>Price</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-indigo-600">₹{product.price_per_unit}</span>
                        <span className="text-xs text-gray-400 font-medium">/ {product.unit || 'unit'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-bold border border-indigo-100">
                        MOQ: {product.moq} {product.unit || 'units'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button 
                      onClick={() => triggerInquiryModal(product)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Inquire
                    </button>
                    <button 
                      onClick={(e) => triggerOrderModal(e, product)}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Order
                    </button>
                  </div>

                  {/* Supplier info at bottom */}
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                     <span>Supplier: {product.wholesaler?.shop_name || 'Verified Seller'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. MY CONNECTIONS TAB */}
      {activeTab === 'connections' && (
        <div className="connections-tab-content animate-fade-in">
          {connLoading ? (
            <div className="loading-center">
              <div className="spinner spinner-lg" />
              <p>Loading connections…</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">🤝</div>
              <h3>No connections found</h3>
              <p>Discover wholesalers, distributors, or producers in the directory to start building your B2B network!</p>
              <button 
                onClick={() => setActiveTab('discovery')}
                className="btn btn-primary"
                style={{ marginTop: 16 }}
              >
                Browse Supplier Directory
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              {/* Incoming Requests Section */}
              {connections.some(c => c.status === 'pending' && c.initiatorId !== user?.id) && (
                <div>
                  <h3 className="profile-details__subtitle" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <FiClock className="text-primary" /> Incoming Connection Requests ({connections.filter(c => c.status === 'pending' && c.initiatorId !== user?.id).length})
                  </h3>
                  <div className="seller-grid">
                    {connections
                      .filter(c => c.status === 'pending' && c.initiatorId !== user?.id)
                      .map((conn) => (
                        <div key={conn.id} className="profile-card" style={{ cursor: 'default' }}>
                          <div className="profile-card__header">
                            <div className="profile-card__avatar">
                              {conn.otherUser.shop_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="badge badge-accent">
                              {formatRoleLabel(conn.otherUser.role)}
                            </span>
                          </div>
                          <h3 className="profile-card__title">{conn.otherUser.shop_name}</h3>
                          <p className="profile-card__meta">
                            <FiMapPin className="text-primary" />
                            <span className="line-clamp-1">{(conn.otherUser.city && conn.otherUser.state) ? `${conn.otherUser.city}, ${conn.otherUser.state}` : (conn.otherUser.location_name || conn.otherUser.address || 'Pan India')}</span>
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                            <button 
                              onClick={() => handleUpdateConnection(conn.id, 'accepted')}
                              className="btn btn-primary btn-sm"
                              style={{ justifyContent: 'center' }}
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => handleUpdateConnection(conn.id, 'rejected')}
                              className="btn btn-secondary btn-sm"
                              style={{ justifyContent: 'center' }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Outgoing Requests Section */}
              {connections.some(c => c.status === 'pending' && c.initiatorId === user?.id) && (
                <div>
                  <h3 className="profile-details__subtitle" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <FiNavigation className="text-primary" /> Outgoing Connection Requests ({connections.filter(c => c.status === 'pending' && c.initiatorId === user?.id).length})
                  </h3>
                  <div className="seller-grid">
                    {connections
                      .filter(c => c.status === 'pending' && c.initiatorId === user?.id)
                      .map((conn) => (
                        <div key={conn.id} className="profile-card" style={{ cursor: 'default' }}>
                          <div className="profile-card__header">
                            <div className="profile-card__avatar">
                              {conn.otherUser.shop_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="badge badge-accent">
                              {formatRoleLabel(conn.otherUser.role)}
                            </span>
                          </div>
                          <h3 className="profile-card__title">{conn.otherUser.shop_name}</h3>
                          <p className="profile-card__meta">
                            <FiMapPin className="text-primary" />
                            <span className="line-clamp-1">{(conn.otherUser.city && conn.otherUser.state) ? `${conn.otherUser.city}, ${conn.otherUser.state}` : (conn.otherUser.location_name || conn.otherUser.address || 'Pan India')}</span>
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
                            <FiClock className="animate-spin text-primary" style={{ animationDuration: '3s' }} /> Waiting for Approval
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Active Connections Section */}
              <div>
                <h3 className="profile-details__subtitle" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <FiUser className="text-primary" /> Active Connections ({connections.filter(c => c.status === 'accepted').length})
                </h3>
                {connections.filter(c => c.status === 'accepted').length === 0 ? (
                  <div className="card text-center" style={{ padding: '24px', color: 'var(--text-muted)' }}>
                    <p>No active connections yet. Once connection requests are accepted, they will show up here.</p>
                  </div>
                ) : (
                  <div className="seller-grid">
                    {connections
                      .filter(c => c.status === 'accepted')
                      .map((conn) => (
                        <div key={conn.id} className="profile-card" style={{ cursor: 'default' }}>
                          <div className="profile-card__header">
                            <div className="profile-card__avatar">
                              {conn.otherUser.shop_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="badge badge-accent">
                              {formatRoleLabel(conn.otherUser.role)}
                            </span>
                          </div>
                          <h3 className="profile-card__title">{conn.otherUser.shop_name}</h3>
                          <p className="profile-card__meta">
                            <FiMapPin className="text-primary" />
                            <span className="line-clamp-1">{(conn.otherUser.city && conn.otherUser.state) ? `${conn.otherUser.city}, ${conn.otherUser.state}` : (conn.otherUser.location_name || conn.otherUser.address || 'Pan India')}</span>
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                            <button 
                              onClick={() => startChatWithSeller(conn.otherUser.id)}
                              className="btn btn-primary btn-sm"
                              style={{ justifyContent: 'center' }}
                            >
                              <FiMessageSquare /> Message
                            </button>
                            <button 
                              onClick={() => viewSellerProfile(conn.otherUser.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ justifyContent: 'center' }}
                            >
                              <FiUser /> Profile
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* 4. CHAT SYSTEM (WHATSAPP WEB MVP) */}
      {activeTab === 'chat' && (
        <div className="chat-system">
          {/* Chat Sidebar: List of Conversations */}
          <div className="chat-sidebar">
            <div className="chat-sidebar__header">
              <FiMessageSquare /> My Conversations
            </div>
            
            {chatsLoading ? (
              <div className="loading-center" style={{ padding: 24 }}>
                <div className="spinner" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <p style={{ fontSize: 13 }}>No active chats.</p>
                <button 
                  onClick={() => setActiveTab('discovery')}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 12 }}
                >
                  Find Wholesalers
                </button>
              </div>
            ) : (
              <div className="chat-sidebar__list">
                {conversations.map((conv) => {
                  const partner = getChatPartner(conv);
                  if (!partner) return null;
                  const active = activeConv?.id === conv.id;
                  
                  return (
                    <div 
                      key={conv.id} 
                      className={`chat-item ${active ? 'chat-item--active' : ''}`}
                      onClick={() => {
                        setActiveConv(conv);
                        fetchMessages(conv.id, true);
                      }}
                    >
                      <div className="chat-item__avatar">
                        {partner.shop_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="chat-item__content">
                        <div className="chat-item__header">
                          <span className="chat-item__name">{partner.shop_name}</span>
                          <span className="chat-item__role">{formatRoleLabel(partner.role)}</span>
                        </div>
                        <p className="chat-item__preview">Click to view messages...</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat Main Window: Message Thread */}
          <div className="chat-main">
            {activeConv ? (
              <>
                {/* Header */}
                <div className="chat-header">
                  <div className="chat-header__info">
                    <button className="chat-header__back" onClick={() => setActiveConv(null)}>
                      <FiArrowLeft />
                    </button>
                    {(() => {
                      const partner = getChatPartner(activeConv);
                      if (!partner) return null;
                      return (
                        <>
                          <div className="chat-item__avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                            {partner.shop_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                              {partner.shop_name}
                            </h4>
                            <span className="badge badge-success" style={{ fontSize: 9, padding: '1px 6px' }}>
                              {formatRoleLabel(partner.role)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Google Maps link directly in Chat header if they have a location! */}
                  {(() => {
                    const partner = getChatPartner(activeConv);
                    if (!partner || !partner.id) return null;
                    return (
                      <button 
                        onClick={() => viewSellerProfile(partner.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        <FiUser /> View Profile
                      </button>
                    );
                  })()}
                </div>

                {/* Messages Body */}
                <div className="chat-messages">
                  {messagesLoading ? (
                    <div className="loading-center">
                      <div className="spinner" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="empty-state">
                      <p>No messages yet. Send a message to start conversing!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSender = msg.sender_id === user.id;
                      return (
                        <div 
                          key={msg.id} 
                          className={`msg-bubble ${isSender ? 'msg-bubble--sender' : 'msg-bubble--receiver'}`}
                        >
                          <p style={{ margin: 0 }}>{msg.message}</p>
                          <span className="msg-bubble__time">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Footer Send Input */}
                <div className="chat-footer">
                  <form onSubmit={handleSendMessage} className="chat-form">
                    <input 
                      type="text" 
                      className="chat-input"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: 12 }}>
                      <FiSend />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="chat-main__empty">
                <FiMessageSquare className="chat-main__empty-icon" />
                <h3>No Chat Selected</h3>
                <p>Select an ongoing conversation from the sidebar, or discover sellers to initiate a new connection chat.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Inquiry Overlay Modal Component ── */}
      {showInquiryModal && selectedInquiryProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>📦 Send Product Inquiry</h2>
              <button className="btn-ghost" onClick={() => setShowInquiryModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSendInquirySubmit}>
              <div className="modal-body">
                <div>
                  <label className="inquiry-form-label">Product Name</label>
                  <p className="inquiry-prefilled-val">{selectedInquiryProduct.product_name}</p>

                  <label className="inquiry-form-label">MOQ Requirement</label>
                  <p className="inquiry-prefilled-val" style={{ marginBottom: 20 }}>
                    {selectedInquiryProduct.moq} {selectedInquiryProduct.unit || 'units'}
                  </p>

                  <div className="form-group">
                    <label className="form-label">Requested Quantity</label>
                    <input 
                      type="number" 
                      min={selectedInquiryProduct.moq || 1}
                      required 
                      className="form-input" 
                      value={inquiryQty}
                      onChange={(e) => setInquiryQty(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Your Message to Seller</label>
                    <textarea 
                      rows="4" 
                      required
                      className="form-textarea"
                      value={inquiryMsg}
                      onChange={(e) => setInquiryMsg(e.target.value)}
                      placeholder="Include details about bulk pricing requests or target delivery dates..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInquiryModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={sendingInquiry}>
                  {sendingInquiry ? 'Sending...' : 'Send Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Order Overlay Modal Component ── */}
      {showOrderModal && selectedOrderProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>🛒 Place B2B Order</h2>
              <button className="btn-ghost" onClick={() => setShowOrderModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handlePlaceOrderSubmit}>
              <div className="modal-body">
                <div>
                  <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-muted)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{selectedOrderProduct.product_name}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <div>💰 Unit Price: <strong>₹{selectedOrderProduct.price_per_unit}</strong></div>
                      <div>📦 Available Stock: <strong>{selectedOrderProduct.stock_available} {selectedOrderProduct.unit || 'units'}</strong></div>
                      {selectedOrderProduct.moq > 0 && (
                        <div style={{ gridColumn: 'span 2' }}>
                          ⚠️ Minimum Order Quantity (MOQ): <strong>{selectedOrderProduct.moq} {selectedOrderProduct.unit || 'units'}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input 
                      type="number" 
                      min={selectedOrderProduct.moq || 1}
                      max={selectedOrderProduct.stock_available}
                      required 
                      className="form-input" 
                      value={orderQty}
                      onChange={(e) => setOrderQty(parseInt(e.target.value) || '')}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Delivery Location</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={orderDeliveryLocation}
                      onChange={(e) => setOrderDeliveryLocation(e.target.value)}
                      placeholder="Enter exact delivery address..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes for Seller (Optional)</label>
                    <textarea 
                      rows="3" 
                      className="form-textarea"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Add any specific delivery instructions..."
                    />
                  </div>

                  {/* live computation */}
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total Price:</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)' }}>
                      ₹{((parseInt(orderQty) || 0) * (selectedOrderProduct.price_per_unit || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={placingOrder || !orderQty || orderQty < selectedOrderProduct.moq || orderQty > selectedOrderProduct.stock_available}
                >
                  {placingOrder ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ConnectFeature;
