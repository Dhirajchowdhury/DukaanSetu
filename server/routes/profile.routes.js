const express = require('express');
const { updateLocation, discoverProfiles, getSellerProfile, getRecommended, getTrending, markProfileComplete, reverseGeocode } = require('../controllers/profile.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');

const router = express.Router();

// Publicly accessible profile page with optional authentication to verify connection status
router.get('/:id', optionalProtect, getSellerProfile);

// Protect all other profile endpoints
router.use(protect);

router.post('/reverse-geocode', reverseGeocode);
router.put('/complete',       markProfileComplete);
router.put('/location',       updateLocation);
router.post('/update-location', updateLocation);
router.get('/recommended',    getRecommended);
router.get('/trending',       getTrending);
router.get('/discover',      discoverProfiles);

module.exports = router;
