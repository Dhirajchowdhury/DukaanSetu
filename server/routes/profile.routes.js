const express = require('express');
const { updateLocation, discoverProfiles, getSellerProfile, getRecommended, getTrending, markProfileComplete, reverseGeocode } = require('../controllers/profile.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.post('/reverse-geocode', reverseGeocode);
router.put('/complete',       markProfileComplete);
router.put('/location',       updateLocation);
router.get('/recommended',    getRecommended);
router.get('/trending',       getTrending);
router.get('/discover',      discoverProfiles);
router.get('/:userId',       getSellerProfile);

module.exports = router;
