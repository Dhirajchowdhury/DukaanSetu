const cache = new Map();

const CACHE_TTL = 60 * 60 * 1000;

function getCacheKey(userId, endpoint) {
  return `${userId}:${endpoint}`;
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function set(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

module.exports = { getCacheKey, get, set };
