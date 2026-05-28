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
    console.warn('⚠️  GOOGLE_MAPS_API_KEY not set — returning Kolkata fallback.');
    return {
      address: 'Kolkata, West Bengal, India',
      city:    'Kolkata',
      state:   'West Bengal',
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await axios.get(url, { timeout: 8000 });

    if (!res.data.results || !res.data.results.length) {
      return {
        address: 'Kolkata, West Bengal, India',
        city:    'Kolkata',
        state:   'West Bengal',
      };
    }

    const result     = res.data.results[0];
    const components = result.address_components || [];

    const cityComp = components.find(c =>
      c.types.includes('locality') ||
      c.types.includes('postal_town') ||
      c.types.includes('sublocality_level_1') ||
      c.types.includes('administrative_area_level_2')
    );

    const stateComp = components.find(c => c.types.includes('administrative_area_level_1'));

    return {
      address: result.formatted_address,
      city: cityComp?.long_name || "",
      state: stateComp?.long_name || ""
    };
  } catch (err) {
    console.error('❌ Reverse Geocoding Error:', err.message);
    // Return graceful fallback instead of throwing
    return {
      address: 'Kolkata, West Bengal, India',
      city:    'Kolkata',
      state:   'West Bengal',
    };
  }
};

// Alias used in some controllers
const getAddressFromCoords = reverseGeocode;

module.exports = { reverseGeocode, getAddressFromCoords };
