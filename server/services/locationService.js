const axios = require('axios');

/**
 * Reverse geocode a lat/lng pair via Google Geocoding API.
 * Falls back to coordinate string if API key is missing or call fails.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{address: string, city: string, state: string}>}
 */
const reverseGeocode = async (lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Fallback if key not configured
  if (!apiKey || apiKey === 'your_google_maps_api_key') {
    console.warn('⚠️  GOOGLE_MAPS_API_KEY not set — returning coordinate fallback.');
    return {
      address: `${lat}, ${lng}`,
      city:    '',
      state:   '',
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const { data } = await axios.get(url, { timeout: 8000 });

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn(`⚠️  Geocoding API returned status: ${data.status}`);
      return { address: 'Unknown location', city: '', state: '' };
    }

    const result     = data.results[0];
    const address    = result.formatted_address;
    const components = result.address_components || [];

    // City: locality → postal_town → sublocality_level_1 → admin_area_level_2
    const cityComp = components.find(c =>
      c.types.includes('locality') ||
      c.types.includes('postal_town') ||
      c.types.includes('sublocality_level_1') ||
      c.types.includes('administrative_area_level_2')
    );
    const city = cityComp?.long_name || '';

    // State: administrative_area_level_1
    const stateComp = components.find(c => c.types.includes('administrative_area_level_1'));
    const state = stateComp?.long_name || '';

    return { address, city, state };
  } catch (err) {
    console.error('❌ Reverse Geocoding Error:', err.message);
    // Return graceful fallback instead of throwing
    return { address: 'Unknown location', city: '', state: '' };
  }
};

// Alias used in some controllers
const getAddressFromCoords = reverseGeocode;

module.exports = { reverseGeocode, getAddressFromCoords };
