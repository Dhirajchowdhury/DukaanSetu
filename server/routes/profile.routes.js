const express = require('express');
const { updateLocation, discoverProfiles, getSellerProfile, getRecommended, getTrending, markProfileComplete, reverseGeocode } = require('../controllers/profile.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');

const router = express.Router();

// PUBLIC — no auth required
router.get('/discover', discoverProfiles);

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
