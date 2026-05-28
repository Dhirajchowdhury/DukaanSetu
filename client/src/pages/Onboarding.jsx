import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiNavigation, FiCheck, FiMapPin, FiRefreshCw } from 'react-icons/fi';
import './Onboarding.css';

/* ── Reverse geocode via OpenStreetMap Nominatim (free, no API key) ── */
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.suburb || a.neighbourhood || a.village,
      a.city   || a.town || a.county,
      a.state,
    ].filter(Boolean);
    return parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || '';
  } catch {
    return '';
  }
};

const ONBOARDING_CATEGORIES = [
  'Groceries', 'Fruits & Vegetables', 'Dairy & Eggs', 'Beverages',
  'Bakery', 'Grains & Pulses', 'Household & Cleaning', 'Health & Beauty', 'Other',
];

const Onboarding = () => {
  const { user, checkAuth } = useAuth();

  /* 2 steps for shop_owner (Profile → Location)
     3 steps for supplier roles (Profile → Location → First Listing) */
  const isShopOwner = user?.role === 'shop_owner';
  const totalSteps  = isShopOwner ? 2 : 3;

  const [step,       setStep]       = useState(1);
  const [submitting, setSubmitting] = useState(false);

  /* Step 1 — Profile */
  const [shopName,     setShopName]     = useState(user?.shopName     || '');
  const [phoneNumber,  setPhoneNumber]  = useState(user?.phoneNumber  || '');

  /* Step 2 — Location */
  const [latitude,     setLatitude]     = useState(user?.latitude     || '');
  const [longitude,    setLongitude]    = useState(user?.longitude    || '');
  const [address,      setAddress]      = useState(user?.address      || '');
  const [locationName, setLocationName] = useState(user?.locationName || '');
  const [city,         setCity]         = useState(user?.city         || '');
  const [stateVal,     setStateVal]     = useState(user?.state        || '');
  const [detecting,    setDetecting]    = useState(false);
  const [geocoding,    setGeocoding]    = useState(false);

  /* Step 3 — First listing (supplier only) */
  const [productName,    setProductName]    = useState('');
  const [category,       setCategory]       = useState('Groceries');
  const [pricePerUnit,   setPricePerUnit]   = useState('');
  const [moq,            setMoq]            = useState(1);
  const [stockAvailable, setStockAvailable] = useState('');
  const [unit,           setUnit]           = useState('pieces');
  const [description,    setDescription]    = useState('');

  /* ── Auto reverse-geocode when coords change ── */
  useEffect(() => {
    if (!latitude || !longitude) return;
    let cancelled = false;
    setGeocoding(true);
    api.post('/profile/reverse-geocode', { latitude, longitude })
      .then(({ data }) => {
        if (!cancelled) {
          setAddress(data.address || '');
          setCity(data.city || '');
          setStateVal(data.state || '');
          setLocationName(data.city ? `${data.city}, ${data.state}` : (data.address || ''));
          setGeocoding(false);
        }
      })
      .catch((err) => {
        console.error('Reverse geocode error:', err);
        if (!cancelled) setGeocoding(false);
      });
    return () => { cancelled = true; };
  }, [latitude, longitude]);

  /* ── GPS detection ── */
  const detectLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser.');
    }
    setDetecting(true);
    toast.loading('Acquiring GPS…', { id: 'gps' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setDetecting(false);
        toast.success('Location detected!', { id: 'gps' });
      },
      (err) => {
        console.error(err);
        setDetecting(false);
        toast.error('Could not get GPS. Enter coordinates manually.', { id: 'gps' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ── Step navigation ── */
  const handleNext = () => {
    if (step === 1) {
      if (!shopName.trim())    return toast.error('Business name is required');
      if (!phoneNumber.trim()) return toast.error('Phone number is required');
      setStep(2);
    } else if (step === 2) {
      if (!latitude || !longitude) return toast.error('Please click Auto-Detect My Location to set your coordinates.');
      if (!address.trim()) return toast.error('Please verify or enter your business address.');
      if (totalSteps === 2) {
        // shop_owner — submit directly from step 2
        document.getElementById('onboarding-form').requestSubmit();
      } else {
        setStep(3);
      }
    }
  };

  const handleBack = () => { if (step > 1) setStep(step - 1); };

  /* ── Final submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Update profile
      await api.put('/auth/profile', { shopName, phoneNumber });

      // 2. Save location with readable name
      await api.put('/profile/location', {
        latitude:     parseFloat(String(latitude)),
        longitude:    parseFloat(String(longitude)),
        address:      address.trim(),
        locationName: locationName.trim() || address.trim(),
        city:         city.trim(),
        state:        stateVal.trim(),
      });

      // 3. Supplier: create first listing
      if (!isShopOwner) {
        if (!productName.trim() || !pricePerUnit || !stockAvailable) {
          throw new Error('Please fill in all product details');
        }
        await api.post('/connect/my-listings', {
          productName,
          category,
          pricePerUnit:   parseFloat(pricePerUnit),
          moq:            parseInt(String(moq)) || 1,
          stockAvailable: parseInt(String(stockAvailable)) || 0,
          unit,
          location:       locationName || address,
          description,
        });
      }

      // 4. Mark complete
      await api.put('/profile/complete');

      toast.success('Setup complete! Welcome to DukaanSetu 🎉');
      await checkAuth();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Step labels ── */
  const stepLabels = isShopOwner
    ? ['Profile', 'Location']
    : ['Profile', 'Location', 'First Listing'];

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">

        {/* Progress indicators */}
        <div className="onboarding-steps">
          {stepLabels.map((label, idx) => {
            const n = idx + 1;
            return (
              <div
                key={label}
                className={`step-indicator ${step >= n ? 'step-indicator--active' : ''} ${step > n ? 'step-indicator--complete' : ''}`}
              >
                <div className="step-number">
                  {step > n ? <FiCheck /> : n}
                </div>
                <div className="step-label">{label}</div>
              </div>
            );
          })}
        </div>

        {/* Header */}
        <div className="onboarding-header">
          {step === 1 && <><h1>Complete Your Business Profile</h1><p>Basic information about your business</p></>}
          {step === 2 && <><h1>Set Your Location</h1><p>Help nearby partners discover you</p></>}
          {step === 3 && <><h1>Add Your First Listing</h1><p>Publish a product so buyers can find you</p></>}
        </div>

        <form id="onboarding-form" onSubmit={handleSubmit}>

          {/* ── STEP 1: Profile ── */}
          {step === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label>Business / Shop Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ganesh Retailers"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Location ── */}
          {step === 2 && (
            <div className="step-content">
              {/* GPS detect */}
              <div className="location-widget">
                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Use your device GPS for accurate distance calculations.
                </p>
                <button
                  type="button"
                  className="btn-detect-loc"
                  onClick={detectLocation}
                  disabled={detecting}
                >
                  <FiNavigation className={detecting ? 'spin' : ''} />
                  {detecting ? 'Acquiring GPS…' : 'Auto-Detect My Location'}
                </button>
              </div>

              {/* Readable location name (from reverse geocoding) */}
              {(geocoding || locationName) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: geocoding ? 'var(--surface-2)' : 'var(--accent-light)',
                    border: `1px solid ${geocoding ? 'var(--border)' : 'var(--primary-muted)'}`,
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 14,
                  }}
                >
                  {geocoding ? (
                    <><span className="spinner" style={{ width: 14, height: 14 }} /> Fetching location name…</>
                  ) : (
                    <>
                      <FiMapPin style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{locationName}</span>
                      <button
                        type="button"
                        style={{ marginLeft: 'auto', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                        onClick={detectLocation}
                        title="Re-detect"
                      >
                        <FiRefreshCw size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Readable Manual Address */}
              <div className="form-group">
                <label>Readable Display Address *</label>
                <textarea
                  placeholder="e.g. Salt Lake Sector V, Kolkata"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: First Listing (supplier only) ── */}
          {step === 3 && (
            <div className="step-content">
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Fortune Mustard Oil"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {ONBOARDING_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit *</label>
                  <input
                    type="text"
                    placeholder="e.g. Litre, Box, Kg"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Price per Unit (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="150"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Min Order Qty (MOQ)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={moq}
                    onChange={(e) => setMoq(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Initial Stock Available *</label>
                <input
                  type="number"
                  min="0"
                  placeholder="100"
                  value={stockAvailable}
                  onChange={(e) => setStockAvailable(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Short Description</label>
                <textarea
                  placeholder="Bulk discount offers, lead time, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="onboarding-actions">
            {step > 1 && (
              <button type="button" className="btn-back" onClick={handleBack} disabled={submitting}>
                Back
              </button>
            )}
            {step < totalSteps ? (
              <button type="button" className="btn-next" onClick={handleNext}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn-next" disabled={submitting}>
                {submitting ? 'Completing Setup…' : 'Finish Setup'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
