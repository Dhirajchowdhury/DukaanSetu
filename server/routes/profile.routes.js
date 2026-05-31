const express = require('express');
const { updateLocation, discoverProfiles, getSellerProfile, getSellerProducts, getRecommended, getTrending, markProfileComplete, reverseGeocode } = require('../controllers/profile.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');

const router = express.Router();

// PUBLIC — optionally authenticated to check connection status
router.get('/discover', optionalProtect, discoverProfiles);

// Public — get seller's own inventory products
router.get('/products/:id', getSellerProducts);

// Publicly accessible profile page with optional authentication to verify connection status
router.get('/:id', optionalProtect, getSellerProfile);

// Protect all other profile endpoints (require login)
router.use(protect);

router.post('/reverse-geocode', reverseGeocode);
router.put('/complete',       markProfileComplete);
router.put('/location',       updateLocation);
router.post('/update-location', updateLocation);
router.get('/recommended',    getRecommended);
router.get('/trending',       getTrending);

module.exports = router;
