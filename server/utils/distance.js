/**
 * Calculates geographical distance between two coordinates in kilometers using the Haversine formula.
 * @param {number} lat1 - Latitude of location 1
 * @param {number} lng1 - Longitude of location 1
 * @param {number} lat2 - Latitude of location 2
 * @param {number} lng2 - Longitude of location 2
 * @returns {number} Distance in kilometers
 */
function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return Infinity;
  }
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  getDistanceKm
};
