import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const SkeletonCard = () => (
  <div className="profile-card" style={{ opacity: 0.7, pointerEvents: 'none' }}>
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
      <div style={{ width: 52, height: 52, borderRadius: 10, background: '#e2e8f0', animation: 'skeletonPulse 1.5s infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '70%', height: 16, background: '#e2e8f0', borderRadius: 4, marginBottom: 8, animation: 'skeletonPulse 1.5s infinite' }} />
        <div style={{ width: '40%', height: 12, background: '#e2e8f0', borderRadius: 4, animation: 'skeletonPulse 1.5s infinite' }} />
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <div style={{ width: '80%', height: 12, background: '#e2e8f0', borderRadius: 4, animation: 'skeletonPulse 1.5s infinite' }} />
      <div style={{ width: '60%', height: 12, background: '#e2e8f0', borderRadius: 4, animation: 'skeletonPulse 1.5s infinite' }} />
      <div style={{ width: '50%', height: 12, background: '#e2e8f0', borderRadius: 4, animation: 'skeletonPulse 1.5s infinite' }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
      <div style={{ width: '100%', height: 32, background: '#e2e8f0', borderRadius: 8, animation: 'skeletonPulse 1.5s infinite' }} />
      <div style={{ width: '100%', height: 32, background: '#e2e8f0', borderRadius: 8, animation: 'skeletonPulse 1.5s infinite' }} />
    </div>
  </div>
);

const ProfileSkeleton = () => (
  <div className="profile-details-skeleton animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'skeletonPulse 1.5s infinite' }}>
    <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flex: '1 1 300px' }}>
        <div style={{ width: 72, height: 72, borderRadius: 12, background: '#e2e8f0' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '50%', height: 24, background: '#e2e8f0', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 100, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
            <div style={{ width: 150, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 120, height: 40, background: '#e2e8f0', borderRadius: 8 }} />
        <div style={{ width: 120, height: 40, background: '#e2e8f0', borderRadius: 8 }} />
      </div>
    </div>
    <div style={{ width: '220px', height: 20, background: '#e2e8f0', borderRadius: 4, margin: '20px 0 10px' }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: 20, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ width: '70%', height: 16, background: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: '40%', height: 12, background: '#e2e8f0', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f8fafc', paddingTop: 12 }}>
            <div style={{ width: '40%', height: 24, background: '#e2e8f0', borderRadius: 4 }} />
            <div style={{ width: '30%', height: 18, background: '#e2e8f0', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #f8fafc', paddingTop: 12 }}>
            <div style={{ flex: 1, height: 32, background: '#e2e8f0', borderRadius: 6 }} />
            <div style={{ flex: 1, height: 32, background: '#e2e8f0', borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const computeB2BScore = (profile) => {
  let score = 0;
  const totalProducts = profile.total_products !== undefined ? profile.total_products : (profile.productCount !== undefined ? profile.productCount : 0);
  const distance = profile.distance_km !== undefined ? profile.distance_km : (profile.distance !== undefined ? profile.distance : null);
  const hasGPS = profile.latitude != null && profile.longitude != null;

  // 1. Product Existence (weight 40)
  if (totalProducts > 0) {
    score += 40;
  }

  // 2. Verified Location (weight 30)
  if (hasGPS) {
    score += 30;
  }

  // 3. Proximity Distance (weight 20)
  if (distance !== null) {
    // Closer suppliers get more points up to 20
    score += Math.max(0, 20 * (1 - distance / 50)); // Scale within 50km
  } else {
    // Pan-India supplier has a flat 5 points base for geographical coverage
    score += 5;
  }

  // 4. Activity Indicator / Network Status (weight 10)
  if (profile.isConnected) {
    score += 10;
  } else if (totalProducts > 5) {
    score += 8;
  } else {
    score += 5;
  }

  return score;
};

const SupplierCard = React.memo(({ 
  profile, 
  onConnect, 
  onMessage, 
  onViewProfile,
  isClosest,
  isBestPrice,
  isTrending,
  formatRoleLabel,
  navigate,
  id
}) => {
  const shopName = profile.shop_name || profile.wholesaler?.shop_name || 'Verified Supplier';
  const role = profile.role || profile.wholesaler?.role || '';
  const totalProducts = profile.total_products !== undefined ? profile.total_products : (profile.productCount !== undefined ? profile.productCount : 0);
  const minPrice = profile.min_price !== undefined ? profile.min_price : (profile.minPrice !== undefined ? profile.minPrice : 0);
  const maxPrice = profile.max_price !== undefined ? profile.max_price : (profile.maxPrice !== undefined ? profile.maxPrice : 0);
  const distance = profile.distance_km !== undefined ? profile.distance_km : (profile.distance !== undefined ? profile.distance : null);
  const isConnected = profile.isConnected;

  const city = profile.city || profile.wholesaler?.city;
  const state = profile.state || profile.wholesaler?.state;
  const lat = profile.latitude || profile.wholesaler?.latitude;
  const lng = profile.longitude || profile.wholesaler?.longitude;

  const cardLocation =
    (city && state && `${city}, ${state}`) ||
    city ||
    "🌍 Pan-India supplier";

  return (
    <div 
      className="profile-card"
      onClick={() => {
        if (!profile?.id) return;
        console.log(`[DEBUG] SupplierCard click - profile.id before navigation:`, profile.id);
        navigate(`/profile/${profile.id}`);
      }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}
    >
      <div>
        {/* Smart Badges Row */}
        {(isClosest || isBestPrice || isTrending) && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {isClosest && (
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '10px' }}>
                🟢 Closest
              </span>
            )}
            {isBestPrice && (
              <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '10px' }}>
                💰 Best Price
              </span>
            )}
            {isTrending && (
              <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '10px' }}>
                🔥 Trending
              </span>
            )}
          </div>
        )}

        <div className="profile-card__header header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div className="profile-card__avatar avatar" style={{ fontWeight: 700 }}>
              {shopName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="profile-card__title" style={{ margin: 0, fontSize: '16.5px', fontWeight: 700 }}>
                {shopName}
              </h3>
              <p className="profile-card__role" style={{ margin: '3px 0 0 0' }}>
                <span className="badge badge-accent" style={{ padding: '2px 8px', fontSize: '10px', textTransform: 'capitalize' }}>
                  {formatRoleLabel(role)}
                </span>
              </p>
            </div>
          </div>
          <FiChevronRight className="profile-card__chevron" style={{ color: 'var(--text-muted)', fontSize: '18px' }} />
        </div>

        <div className="profile-card__body body" style={{ marginTop: 12 }}>
          <p className="profile-card__meta" style={{ margin: '6px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '14px' }}>📍</span>
            <span className="line-clamp-1" title={cardLocation}>{cardLocation}</span>
          </p>
          <p style={{ margin: '6px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '14px' }}>📦</span>
            <span>{totalProducts > 0 ? `${totalProducts} products listed` : "📦 No products listed yet"}</span>
          </p>
          <p style={{ margin: '6px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '14px' }}>💰</span>
            <span>{totalProducts > 0 ? `₹${minPrice} - ₹${maxPrice}` : "Connect to request catalog"}</span>
          </p>

          {distance !== null && (
            <div style={{ marginTop: 10 }}>
              <span className="profile-card__distance" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📍 {distance.toFixed(1)} km away
              </span>
            </div>
          )}

          {/* Social Proof Indicator */}
          <div className="profile-card__trust" style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="trust-dot trust-dot--active"></span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Active this week
            </span>
          </div>
        </div>
      </div>

      <div 
        style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {isConnected ? (
          <button
            className="btn btn-primary btn-sm"
            style={{ width: "100%", justifyContent: "center", gap: 6, height: '36px' }}
            onClick={(e) => { e.stopPropagation(); onMessage(id); }}
          >
            💬 Message
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            style={{ width: "100%", justifyContent: "center", gap: 6, height: '36px' }}
            onClick={(e) => onConnect(e, id)}
          >
            🔵 Connect
          </button>
        )}
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: "100%", justifyContent: "center", height: '36px' }}
          onClick={(e) => {
            e.stopPropagation();
            if (!profile?.id) return;
            console.log(`[DEBUG] View Profile button click - profile.id before navigation:`, profile.id);
            onViewProfile(profile.id);
          }}
        >
          View Profile
        </button>
      </div>
    </div>
  );
});

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
  // Smart B2B Supplier Ranking
  const sortedProfiles = useMemo(() => {
    return [...profiles]
      .map(p => ({
        ...p,
        _b2bScore: computeB2BScore(p)
      }))
      .sort((a, b) => b._b2bScore - a._b2bScore);
  }, [profiles]);
  // Single Profile View state
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerListings, setSellerListings] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileCache, setProfileCache] = useState({});

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
    if (activeTab === 'discovery') {
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
    
    // Save original state for rollback
    const originalProfiles = [...profiles];
    
    // Immediately update UI to connected
    setProfiles(prev => prev.map(p => {
      const pId = p.id || p.wholesaler?.id;
      if (pId === otherUserId) {
        return { ...p, isConnected: true };
      }
      return p;
    }));
    
    const loadingToastId = toast.loading('Connecting...');
    
    try {
      await api.post(`/connections/${otherUserId}`);
      toast.success('Connected successfully!', { id: loadingToastId });
    } catch (error) {
      console.error(error);
      // Rollback on failure
      setProfiles(originalProfiles);
      toast.error(error.response?.data?.message || 'Failed to connect. Reverting connection status.', { id: loadingToastId });
    }
  };

  const handleConnectProfileUser = async (e, otherUserId) => {
    if (e) e.stopPropagation();
    
    // Save original states for rollback
    const originalProfiles = [...profiles];
    const originalProfile = sellerProfile;
    
    // Immediately update UI to connected
    setProfiles(prev => prev.map(p => {
      const pId = p.id || p.wholesaler?.id;
      if (pId === otherUserId) {
        return { ...p, isConnected: true };
      }
      return p;
    }));
    setSellerProfile(prev => prev ? { ...prev, isConnected: true } : null);
    
    const loadingToastId = toast.loading('Connecting...');
    
    try {
      await api.post(`/connections/${otherUserId}`);
      toast.success('Connected successfully!', { id: loadingToastId });

      // Update in-memory profile cache
      setProfileCache(prev => {
        if (!prev[otherUserId]) return prev;
        return {
          ...prev,
          [otherUserId]: {
            ...prev[otherUserId],
            seller: { ...prev[otherUserId].seller, isConnected: true }
          }
        };
      });
    } catch (error) {
      console.error(error);
      // Rollback on failure
      setProfiles(originalProfiles);
      setSellerProfile(originalProfile);
      toast.error(error.response?.data?.message || 'Failed to connect. Reverting connection status.', { id: loadingToastId });
    }
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
      // API baseURL: /api  →  full URL: /api/profile/discover
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

      console.log("[DISCOVER] API response:", data);
      console.log("[DISCOVER] Fetched suppliers:", data?.profiles);
      console.log("[DISCOVER] Supplier count:", data?.profiles?.length || 0);
      if (data?.profiles?.length > 0) {
        console.log("[DISCOVER] First supplier:", data.profiles[0]);
      }

      const suppliers = data?.profiles || [];
      setProfiles(suppliers);
      setDPages(1); // no server-side pagination for discover
    } catch (error) {
      console.error("DISCOVER API ERROR:", {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      toast.error(error.response?.data?.message || 'Failed to load seller discovery profiles');
    } finally {
      setDLoading(false);
    }
  };

  // ── Single Seller Profile details ──
  const viewSellerProfile = async (userId) => {
    const isDev = process.env.NODE_ENV !== 'production';
    setProfileLoading(true);
    setSelectedSellerId(userId);

    // Evaluate cache hit
    if (profileCache[userId]) {
      if (isDev) {
        console.log(`[viewSellerProfile] Cache hit for id: ${userId}`);
      }
      setSellerProfile(profileCache[userId].seller);
      setSellerListings(profileCache[userId].listings || []);
      setProfileLoading(false);

      // Still fetch fresh products (not cached)
      try {
        const prodRes = await api.get(`/profile/products/${userId}`);
        setSellerProducts(prodRes.data?.products || []);
      } catch {
        setSellerProducts([]);
      }
      return;
    }

    if (isDev) {
      console.log(`[viewSellerProfile] Cache miss. Fetching profile for id: ${userId}`);
    }

    try {
      const { data } = await api.get(`/profile/${userId}`);
      if (isDev) {
        console.log("[viewSellerProfile] API response received:", data);
      }

      // Store in memory cache
      setProfileCache(prev => ({
        ...prev,
        [userId]: { seller: data.seller, listings: data.listings || [] }
      }));

      setSellerProfile(data.seller);
      setSellerListings(data.listings || []);

      // Fetch seller's own inventory products
      try {
        const prodRes = await api.get(`/profile/products/${userId}`);
        console.log("[SELLER PRODUCTS] Response:", prodRes.data);
        setSellerProducts(prodRes.data?.products || []);
      } catch (prodErr) {
        console.error("[SELLER PRODUCTS] Error:", prodErr);
        setSellerProducts([]);
      }
    } catch (error) {
      if (isDev) {
        console.error("[viewSellerProfile] API error loading seller details:", error);
      }
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
      fetchSellerProducts(routeSellerId);
    } else {
      setSelectedSellerId(null);
      setSellerProfile(null);
      setSellerListings([]);
      setSellerProducts([]);
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
      console.log(`[Messaging] Fetching messages for conversation: ${convId}`);
      const { data } = await api.get(`/messages/${convId}`);
      console.log(`[Messaging] Messages fetched successfully:`, data.messages ? data.messages.length : 0);
      if (data.messages?.length > 0) {
        console.log("[Messaging] First message keys:", Object.keys(data.messages[0]));
        console.log("[Messaging] First message full:", data.messages[0]);
      }
      setMessages(data.messages || []);
    } catch (error) {
      console.error('[Messaging] Error fetching messages:', error);
    } finally {
      if (showSpinner) setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;

    const messageText = newMessage.trim();
    if (!messageText) {
      toast.error('Message content cannot be empty');
      return;
    }

    const sender_id = user?.id;
    const partner = getChatPartner(activeConv) || sellerProfile;
    const receiver_id = partner?.id;

    if (!sender_id) {
      toast.error('Sender profile unavailable');
      return;
    }
    if (!receiver_id) {
      toast.error('Receiver profile unavailable');
      return;
    }

    setNewMessage(''); // optimistic UI clear

    try {
      let convId = activeConv?.id;
      if (!convId) {
        console.log(`[Messaging] Conversation ID missing. Creating conversation first for receiver_id: ${receiver_id}`);
        try {
          const { data: convData } = await api.post('/conversations', { otherUserId: receiver_id });
          convId = convData.conversation?.id;
          if (!convId) {
            throw new Error("Invalid conversation response");
          }
          setActiveConv(convData.conversation);
          console.log(`[Messaging] Conversation created successfully: ${convId}`);
        } catch (convErr) {
          console.error(`[Messaging] Conversation creation failed, stopping message delivery:`, convErr);
          toast.error('Could not establish conversation with this supplier');
          setNewMessage(messageText); // restore text
          return; // STOP EXECUTION!
        }
      }

      console.log(`[Messaging] Sending message to POST /api/messages. Payload:`, {
        conversation_id: convId,
        sender_id,
        receiver_id,
        content: messageText
      });

      const { data } = await api.post('/messages', {
        conversation_id: convId,
        sender_id,
        receiver_id,
        content: messageText
      });

      console.log(`[Messaging] Message sent successfully. Response:`, data);

      const msgObj = data.message || {
        id: data.id || Math.random().toString(),
        text: messageText,
        sender_id,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, msgObj]);
    } catch (error) {
      console.error('[Messaging] Failed to send message:', error);
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

  // Memoized B2B Supplier Cards list rendering to maximize UI performance
  const supplierCards = useMemo(() => {
    if (sortedProfiles.length === 0) return null;

    const activeDistances = sortedProfiles.map(p => p.distance_km ?? p.distance).filter(d => d !== null && d > 0);
    const minDistance = activeDistances.length > 0 ? Math.min(...activeDistances) : Infinity;

    const activePrices = sortedProfiles.map(p => p.minPrice ?? p.min_price).filter(p => p > 0);
    const overallMinPrice = activePrices.length > 0 ? Math.min(...activePrices) : Infinity;

    const activeCounts = sortedProfiles.map(p => p.total_products !== undefined ? p.total_products : (p.productCount !== undefined ? p.productCount : 0));
    const maxCount = activeCounts.length > 0 ? Math.max(...activeCounts) : 0;

    return sortedProfiles.map((profile) => {
      const id = profile.id || profile.wholesaler?.id;
      const totalProducts = profile.total_products !== undefined ? profile.total_products : (profile.productCount !== undefined ? profile.productCount : 0);
      const minPrice = profile.min_price !== undefined ? profile.min_price : (profile.minPrice !== undefined ? profile.minPrice : 0);
      const distance = profile.distance_km !== undefined ? profile.distance_km : (profile.distance !== undefined ? profile.distance : null);

      const isClosest = distance !== null && distance > 0 && distance === minDistance;
      const isBestPrice = minPrice > 0 && minPrice === overallMinPrice;
      const isTrending = totalProducts > 0 && totalProducts === maxCount;

      const sLat = profile.wholesaler?.latitude ?? profile.latitude;
      const sLng = profile.wholesaler?.longitude ?? profile.longitude;
      const hasS = sLat != null && sLng != null;

      const shortLoc = hasS
        ? ((profile.city && profile.state) ? `${profile.city}, ${profile.state}` : (profile.location_name || profile.wholesaler?.location_name || profile.address || profile.wholesaler?.address || 'Verified Supplier'))
        : "🌍 Pan-India supplier";

      return (
        <SupplierCard
          key={id}
          id={id}
          profile={profile}
          onConnect={handleConnectUser}
          onMessage={startChatWithSeller}
          onViewProfile={(sellerId) => {
            if (!sellerId) return;
            console.log(`[DEBUG] onViewProfile navigation - sellerId before navigation:`, sellerId);
            navigate(`/profile/${sellerId}`);
          }}
          isClosest={isClosest}
          isBestPrice={isBestPrice}
          isTrending={isTrending}
          formatRoleLabel={formatRoleLabel}
          navigate={navigate}
        />
      );
    });
  }, [sortedProfiles, navigate]);

  // Memoized B2B Single Profile details view to optimize rendering performance and bypass redundant sub-tree renders
  const sellerProfileView = useMemo(() => {
    if (!sellerProfile) {
      return (
        <div className="card empty-state animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <h3>Profile not found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>The requested supplier profile could not be loaded or does not exist.</p>
          <button onClick={() => setSelectedSellerId(null)} className="btn btn-primary" style={{ marginTop: '16px' }}>
            Return to Directory
          </button>
        </div>
      );
    }

    const shopName = sellerProfile?.shop_name || 'Verified Supplier';
    const role = sellerProfile?.role || '';
    const lat = sellerProfile?.latitude;
    const lng = sellerProfile?.longitude;
    const hasGPS = lat != null && lng != null;
    const city = sellerProfile?.city;
    const state = sellerProfile?.state;
    const locationName = sellerProfile?.location_name || sellerProfile?.locationName;
    const address = sellerProfile?.address;

    const sellerLoc =
      (city && state && `${city}, ${state}`) ||
      city ||
      "🌍 Pan-India supplier";

    const listings = sellerListings || [];

    return (
      <div className="animate-fade-in">
        {/* Profile Hero Header Card */}
        <div className="profile-details__hero">
          <div className="profile-details__info">
            <div className="profile-details__shop-icon">
              {shopName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="profile-details__name">{shopName}</h2>
              <div className="profile-details__meta">
                <span className="badge badge-accent">
                  {formatRoleLabel(role)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FiMapPin className="text-primary" /> {sellerLoc}
                </span>
                {/* Show maps verified status */}
                {hasGPS && (
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
            {hasGPS ? (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ textDecoration: 'none', gap: 6 }}
                title="View exact shop location"
                onClick={(e) => e.stopPropagation()}
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
            {sellerProfile?.isConnected ? (
              <button 
                onClick={(e) => { e.stopPropagation(); startChatWithSeller(sellerProfile?.id); }}
                className="btn btn-primary"
                style={{ gap: 6 }}
              >
                <FiMessageSquare /> Message
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); handleConnectProfileUser(e, sellerProfile?.id); }}
                className="btn btn-primary"
                style={{ gap: 6 }}
                disabled={connectingUsers[sellerProfile?.id]}
              >
                {connectingUsers[sellerProfile?.id] ? (
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
          <FiPackage className="text-primary" /> Available Products ({listings.length})
        </h3>

        {listings.length === 0 ? (
          <div className="card empty-state">
            <p>This seller hasn't listed any wholesale products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((product) => {
              if (!product) return null;
              return (
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
                      onClick={(e) => { e.stopPropagation(); triggerInquiryModal(product); }}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Inquire
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); triggerOrderModal(e, product); }}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Seller's own inventory products */}
        <h3 className="profile-details__subtitle" style={{ marginTop: 32 }}>
          <FiPackage className="text-primary" /> Inventory Products ({(sellerProducts || []).length})
        </h3>
        {(sellerProducts || []).length === 0 ? (
          <div className="card empty-state">
            <p>This seller hasn't added any inventory products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellerProducts.map((product) => (
              <div key={product.id} className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between" style={{ minHeight: "200px", borderRadius: "16px" }}>
                <div>
                  <h4 className="text-sm font-bold text-gray-900" style={{ margin: 0 }}>{product.product_name}</h4>
                  {product.brand && <p className="text-xs text-gray-400" style={{ margin: '4px 0 0' }}>{product.brand}</p>}
                  <div className="mt-3 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold" style={{ margin: 0 }}>Price</p>
                      <span className="text-lg font-black text-indigo-600">₹{product.selling_price || product.cost_price || 0}</span>
                      <span className="text-xs text-gray-400 ml-1">/ {product.unit || 'unit'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold">Qty: {product.quantity || 0}</span>
                    </div>
                  </div>
                </div>
                {product.expiry_date && (
                  <p className="text-xs text-gray-400 mt-2" style={{ margin: 0 }}>Exp: {new Date(product.expiry_date).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [sellerProfile, sellerListings, sellerProducts, connectingUsers, routeSellerId]);

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
            <div className="seller-grid">
              {Array.from({ length: 6 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
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
                {supplierCards}
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
            <ProfileSkeleton />
          ) : (
            sellerProfileView
          )}
        </div>
      )}

      {/* MY CONNECTIONS TAB */}
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
                    <p style={{ margin: 0 }}>{msg.content || msg.message || msg.text}</p>
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
