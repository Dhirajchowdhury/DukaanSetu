import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiMapPin, FiNavigation, FiPlus, FiCheck } from 'react-icons/fi';
import './Onboarding.css';

const ONBOARDING_CATEGORIES = [
  'Groceries',
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Beverages',
  'Bakery',
  'Grains & Pulses',
  'Household & Cleaning',
  'Health & Beauty',
  'Other'
];

const Onboarding = () => {
  const { user, checkAuth } = useAuth();
  const { categories, fetchCategories } = useProducts();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Profile details
  const [shopName, setShopName] = useState(user?.shopName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  // Step 2: Location
  const [latitude, setLatitude] = useState(user?.latitude || '');
  const [longitude, setLongitude] = useState(user?.longitude || '');
  const [address, setAddress] = useState(user?.address || '');
  const [detecting, setDetecting] = useState(false);

  // Step 3: Action fields
  // For shop owner:
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  // For supplier roles:
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [moq, setMoq] = useState(1);
  const [stockAvailable, setStockAvailable] = useState('');
  const [unit, setUnit] = useState('pieces');
  const [description, setDescription] = useState('');

  const isShopOwner = user?.role === 'shop_owner';

  useEffect(() => {
    fetchCategories();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser.');
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAddress(`Coordinates: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
        setDetecting(false);
        toast.success('Location detected!');
      },
      (error) => {
        console.error(error);
        setDetecting(false);
        toast.error('Unable to detect location. Please enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!shopName.trim()) return toast.error('Shop / Business Name is required');
      if (!phoneNumber.trim()) return toast.error('Phone number is required');
      setStep(2);
    } else if (step === 2) {
      if (latitude === '' || longitude === '') {
        return toast.error('Latitude and Longitude coordinates are required');
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Update basic profile fields
      await api.put('/auth/profile', {
        shopName,
        phoneNumber,
        preferences: isShopOwner ? {
          lowStockThreshold: parseInt(lowStockThreshold) || 10
        } : undefined
      });

      // 2. Save location coordinates and address
      await api.put('/profile/location', {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address.trim() || `Lat: ${latitude}, Lng: ${longitude}`
      });

      // 3. For wholesalers/distributors, list their first product
      if (!isShopOwner) {
        if (!productName.trim() || !pricePerUnit || !stockAvailable) {
          throw new Error('Please fill in all product details');
        }
        await api.post('/connect/my-listings', {
          productName,
          category,
          pricePerUnit: parseFloat(pricePerUnit),
          moq: parseInt(moq) || 1,
          stockAvailable: parseInt(stockAvailable) || 0,
          unit,
          location: address.trim(),
          description
        });
      }

      // 4. Mark profile as complete
      await api.put('/profile/complete');

      toast.success('Profile setup complete! Welcome to DukaanSetu.');

      // Refresh authentication state which updates user.isProfileComplete and triggers redirect
      await checkAuth();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Onboarding failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        
        {/* Progress Bar & Indicators */}
        <div className="onboarding-steps">
          <div className={`step-indicator ${step >= 1 ? 'step-indicator--active' : ''} ${step > 1 ? 'step-indicator--complete' : ''}`}>
            <div className="step-number">{step > 1 ? <FiCheck /> : '1'}</div>
            <div className="step-label">Profile</div>
          </div>
          <div className={`step-indicator ${step >= 2 ? 'step-indicator--active' : ''} ${step > 2 ? 'step-indicator--complete' : ''}`}>
            <div className="step-number">{step > 2 ? <FiCheck /> : '2'}</div>
            <div className="step-label">Location</div>
          </div>
          <div className={`step-indicator ${step >= 3 ? 'step-indicator--active' : ''} ${step > 3 ? 'step-indicator--complete' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">{isShopOwner ? 'Preferences' : 'First Listing'}</div>
          </div>
        </div>

        {/* Wizard Header */}
        <div className="onboarding-header">
          {step === 1 && (
            <>
              <h1>Complete Your Business Profile</h1>
              <p>Let's start with basic information about your company</p>
            </>
          )}
          {step === 2 && (
            <>
              <h1>Set Your Location</h1>
              <p>Allow local partners and discovery features to find you easily</p>
            </>
          )}
          {step === 3 && (
            <>
              <h1>{isShopOwner ? 'Configure Inventory Settings' : 'Add Your First Listing'}</h1>
              <p>{isShopOwner ? 'Set up threshold limits for low stock warnings' : 'Publish your first catalog product to local buyers'}</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* STEP 1: Basic Profile */}
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
                  placeholder="e.g. +91 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 2: Location Configuration */}
          {step === 2 && (
            <div className="step-content">
              <div className="location-widget">
                <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  Use your browser location sensor to capture accurate coordinates.
                </p>
                <button
                  type="button"
                  className="btn-detect-loc"
                  onClick={detectLocation}
                  disabled={detecting}
                >
                  <FiNavigation className={detecting ? 'spin' : ''} />
                  {detecting ? 'Acquiring GPS...' : 'Auto-Detect Coordinates'}
                </button>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 22.5726"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 88.3639"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Display Address / Area</label>
                <textarea
                  placeholder="e.g. Salt Lake Sector V, Kolkata"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows="3"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Action Setup */}
          {step === 3 && (
            <div className="step-content">
              {isShopOwner ? (
                // Shop Owner: low-stock settings
                <div className="form-group">
                  <label>Low-Stock Alert Threshold *</label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    required
                  />
                  <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    We will flag inventory items with stock levels equal to or lower than this value.
                  </p>
                </div>
              ) : (
                // Wholesale/Supplier: Create listing
                <>
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
                        {ONBOARDING_CATEGORIES.map(c => (
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
                      <label>Price per Unit *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 150"
                        value={pricePerUnit}
                        onChange={(e) => setPricePerUnit(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Minimum Order Qty (MOQ)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={moq}
                        onChange={(e) => setMoq(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Initial Stock Available *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 100"
                      value={stockAvailable}
                      onChange={(e) => setStockAvailable(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Short Description</label>
                    <textarea
                      placeholder="Product details, bulk discount offers..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows="2"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="onboarding-actions">
            {step > 1 && (
              <button
                type="button"
                className="btn-back"
                onClick={handleBack}
                disabled={submitting}
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                className="btn-next"
                onClick={handleNext}
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                className="btn-next"
                disabled={submitting}
              >
                {submitting ? 'Completing Setup...' : 'Finish Setup'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default Onboarding;
