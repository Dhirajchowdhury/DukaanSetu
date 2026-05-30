const { supabase } = require('../config/db');
const locationService = require('../services/locationService');
const { getDistanceKm } = require('../utils/distance');

/* ── Build profile cards from flat listing rows ──────────────────────────── */
const buildProfiles = (rows, currentUser) => {
  const map = {};
  rows.forEach(item => {
    if (!item.wholesaler) return;
    const wid = item.wholesaler_id;
    if (!map[wid]) {
      let distance = null;
      if (
        currentUser?.latitude && currentUser?.longitude &&
        item.wholesaler.latitude && item.wholesaler.longitude
      ) {
        distance = getDistanceKm(
          parseFloat(currentUser.latitude),
          parseFloat(currentUser.longitude),
          parseFloat(item.wholesaler.latitude),
          parseFloat(item.wholesaler.longitude)
        );
      }
      map[wid] = { wholesaler: item.wholesaler, products: [], minPrice: Infinity, maxPrice: -Infinity, distance };
    }
    map[wid].products.push(item);
    if (item.price_per_unit < map[wid].minPrice) map[wid].minPrice = item.price_per_unit;
    if (item.price_per_unit > map[wid].maxPrice) map[wid].maxPrice = item.price_per_unit;
  });

  return Object.values(map).map(p => ({
    wholesaler:   p.wholesaler,
    productCount: p.products.length,
    minPrice:     p.minPrice === Infinity  ? 0 : p.minPrice,
    maxPrice:     p.maxPrice === -Infinity ? 0 : p.maxPrice,
    distance:     p.distance !== null ? Math.round(p.distance * 10) / 10 : null,
    distance_km:  p.distance !== null ? Math.round(p.distance * 10) / 10 : null,
    topProducts:  [...p.products]
      .sort((a, b) => a.price_per_unit - b.price_per_unit)
      .slice(0, 3)
      .map(({ id, product_name, price_per_unit, unit }) => ({ id, product_name, price_per_unit, unit })),
  }));
};

/**
 * @desc  Update current user's location + mark profile complete
 * @route PUT /api/profile/location
 * body: { latitude, longitude, address, locationName }
 */
const updateLocation = async (req, res, next) => {
  try {
    const latitude = req.body.latitude ?? req.body.lat;
    const longitude = req.body.longitude ?? req.body.lng;
    const manualAddress = req.body.address;
    const manualCity = req.body.city;
    const manualState = req.body.state;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }

    // Auto reverse-geocode if address not provided
    let address   = manualAddress   || null;
    let city      = manualCity      || null;
    let stateVal  = manualState     || null;

    if (!address) {
      try {
        const geo = await locationService.reverseGeocode(parseFloat(latitude), parseFloat(longitude));
        address  = geo.address || null;
        city     = geo.city    || null;
        stateVal = geo.state   || null;
      } catch (geoErr) {
        console.warn('Geocoding failed during updateLocation, continuing without address:', geoErr.message);
      }
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({
        latitude,
        longitude,
        address,
        city:  city,
        state: stateVal,
      })
      .eq('id', req.user.id)
      .select('id, latitude, longitude, address, city, state, is_profile_complete')
      .single();
    if (error) throw error;
    res.json({ message: 'Location updated', user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Mark profile as complete
 * @route PUT /api/profile/complete
 */
const markProfileComplete = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update({ is_profile_complete: true })
      .eq('id', req.user.id)
      .select('id, is_profile_complete')
      .single();
    if (error) throw error;
    res.json({ message: 'Profile marked complete', user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Discovery feed with role filter, search, price range, sort
 * @route GET /api/profile/discover
 * @query search, category, role, minPrice, maxPrice, location, sortBy, page, limit
 */
const discoverProfiles = async (req, res, next) => {
  try {
    const {
      search, category, role, minPrice, maxPrice,
      location, sortBy = 'name', page = 1, limit = 20,
      maxDistance, city,
    } = req.query;

    console.log("[B2B DISCOVER] Query parameters received:", req.query);
    console.log("[B2B DISCOVER] req.user:", JSON.stringify({ id: req.user?.id, role: req.user?.role, email: req.user?.email }));

    const searchLower = search ? search.toLowerCase() : null;
    const categoryLower = category ? category.toLowerCase() : null;
    const locationLower = location ? location.toLowerCase() : null;
    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;

    // JS-side case-insensitive role filter
    const supplierType = role && role.toLowerCase() !== 'all' && role.toLowerCase() !== 'all roles' && role !== 'all_roles' && role !== ''
      ? role.toLowerCase()
      : null;
    console.log(`[B2B DISCOVER] supplierType: ${supplierType}`);

    // ── STEP 1: Verify raw data ──────────────────────────────────────────
    // Fetch ALL supplier-role users (no filters, no joins)
    const { data: rawUsers, error: rawErr } = await supabase
      .from('users')
      .select('id, email, shop_name, role, latitude, longitude, address, city, state, is_profile_complete, created_at')
      .in('role', ['wholesaler', 'distributor', 'producer']);

    if (rawErr) {
      console.error("[B2B DISCOVER] RAW users query FAILED:", rawErr);
      return res.status(500).json({ message: 'DB query failed', error: rawErr });
    }

    console.log(`[B2B DISCOVER] RAW users count (no join): ${rawUsers?.length || 0}`);
    if (rawUsers && rawUsers.length > 0) {
      rawUsers.forEach(u => console.log(`[B2B DISCOVER] RAW user: id=${u.id}, shop_name="${u.shop_name}", role="${u.role}"`));
    } else {
      console.log("[B2B DISCOVER] RAW USERS IS EMPTY — possible RLS or query issue!");
    }

    // ── STEP 2: Now try WITH the product join ────────────────────────────
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, email, shop_name, role, latitude, longitude, address, city, state, is_profile_complete, created_at,
        wholesaler_products:wholesaler_products(*)
      `)
      .in('role', ['wholesaler', 'distributor', 'producer']);

    if (error) {
      console.error("[B2B DISCOVER] JOIN query failed:", error);
      return res.status(500).json({ message: 'DB join query failed', error });
    }

    console.log(`[B2B DISCOVER] JOIN query users count: ${users?.length || 0}`);

    // ── STEP 3: Return debug response (bypassing all filters) ─────────────
    // Build a simple unfiltered profile list from raw users for verification
    const debugProfiles = (rawUsers || [])
      .filter(u => u.id !== req.user.id)  // only exclude self
      .map(u => ({
        id: u.id,
        shop_name: u.shop_name,
        role: u.role,
        latitude: u.latitude,
        longitude: u.longitude,
        address: u.address,
        city: u.city,
        state: u.state,
        hasProducts: false,
        productCount: 0,
      }));

    console.log(`[B2B DISCOVER] DEBUG — Returning ${debugProfiles.length} raw unfiltered profiles (excluding self)`);

    res.json({
      profiles: debugProfiles,
      pagination: { page: 1, limit: debugProfiles.length, total: debugProfiles.length, pages: 1 },
      _debug: {
        rawUsersCount: rawUsers?.length || 0,
        joinedUsersCount: users?.length || 0,
        supplierType,
        reqUserId: req.user?.id,
        hasJoinedProducts: users?.map(u => ({
          id: u.id,
          shop_name: u.shop_name,
          role: u.role,
          productCount: (u.wholesaler_products || []).length,
        })) || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Recommended suppliers (top 10 by score)
 * @route GET /api/profile/recommended
 */
const getRecommended = async (req, res, next) => {
  try {
    let query = supabase
      .from('users')
      .select(`
        id, email, shop_name, role, latitude, longitude, address, city, state, is_profile_complete, created_at,
        wholesaler_products:wholesaler_products(*)
      `)
      .in('role', ['wholesaler', 'distributor', 'producer']);

    const { data: users, error } = await query;
    if (error) throw error;

    // Fetch user's connections for recommended suppliers
    const { data: userConns } = await supabase
      .from('connections')
      .or(`user_id.eq.${req.user.id},connected_user_id.eq.${req.user.id}`);

    const connectedSet = new Set();
    (userConns || []).forEach(c => {
      connectedSet.add(c.user_id === req.user.id ? c.connected_user_id : c.user_id);
    });

    let profiles = [];

    (users || []).forEach(user => {
      let products = (user.wholesaler_products || []).filter(p => p.stock_available > 0);

      // Calculate distance
      let distance = null;
      if (
        req.user?.latitude && req.user?.longitude &&
        user.latitude && user.longitude
      ) {
        distance = getDistanceKm(
          parseFloat(req.user.latitude),
          parseFloat(req.user.longitude),
          parseFloat(user.latitude),
          parseFloat(user.longitude)
        );
      }

      // Calculate aggregates
      let minPriceVal = Infinity;
      let maxPriceVal = -Infinity;
      products.forEach(p => {
        if (p.price_per_unit < minPriceVal) minPriceVal = p.price_per_unit;
        if (p.price_per_unit > maxPriceVal) maxPriceVal = p.price_per_unit;
      });

      profiles.push({
        id: user.id,
        name: user.shop_name,
        shop_name: user.shop_name,
        role: user.role,
        latitude: user.latitude,
        longitude: user.longitude,
        address: user.address,
        city: user.city,
        state: user.state,
        is_profile_complete: user.is_profile_complete,
        total_products: products.length,
        min_price: minPriceVal === Infinity ? 0 : minPriceVal,
        max_price: maxPriceVal === -Infinity ? 0 : maxPriceVal,
        isConnected: connectedSet.has(user.id),
        // Flags for UI predictability and defensive fallbacks
        hasProducts: products.length > 0,
        hasLocation: user.latitude != null && user.longitude != null,
        // Backward compatibility:
        wholesaler: {
          id: user.id,
          shop_name: user.shop_name,
          role: user.role,
          latitude: user.latitude,
          longitude: user.longitude,
          address: user.address,
          city: user.city,
          state: user.state,
          is_profile_complete: user.is_profile_complete,
        },
        productCount: products.length,
        minPrice: minPriceVal === Infinity ? 0 : minPriceVal,
        maxPrice: maxPriceVal === -Infinity ? 0 : maxPriceVal,
        distance: distance !== null ? Math.round(distance * 10) / 10 : null,
        distance_km: distance !== null ? Math.round(distance * 10) / 10 : null,
        topProducts: [...products]
          .sort((a, b) => a.price_per_unit - b.price_per_unit)
          .slice(0, 3)
          .map(({ id, product_name, price_per_unit, unit }) => ({ id, product_name, price_per_unit, unit })),
      });
    });

    const distances = profiles.map(p => p.distance_km).filter(d => d !== null);
    const maxDist = distances.length > 0 ? Math.max(...distances, 1) : 1;
    const counts = profiles.map(p => p.productCount);
    const maxCount = counts.length > 0 ? Math.max(...counts, 1) : 1;

    profiles.forEach(p => {
      const distScore = p.distance_km !== null ? p.distance_km / maxDist : 0.5;
      const countScore = maxCount > 0 ? 1 - p.productCount / maxCount : 0.5;
      p._score = 0.6 * distScore + 0.4 * countScore;
    });
    profiles.sort((a, b) => a._score - b._score);

    res.json({ profiles: profiles.slice(0, 10) });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Trending products (most ordered)
 * @route GET /api/profile/trending
 */
const getTrending = async (req, res, next) => {
  try {
    // Count orders per product
    const { data: orderCounts, error: ocErr } = await supabase
      .from('orders')
      .select('product_id')
      .neq('status', 'cancelled');

    if (ocErr) throw ocErr;

    // Tally counts in JS
    const countMap = {};
    (orderCounts || []).forEach(o => {
      countMap[o.product_id] = (countMap[o.product_id] || 0) + 1;
    });

    const topIds = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    if (topIds.length === 0) {
      // Fallback: newest listings
      const { data: newest } = await supabase
        .from('wholesaler_products')
        .select('*, wholesaler:users!wholesaler_id(id, shop_name)')
        .gt('stock_available', 0)
        .order('created_at', { ascending: false })
        .limit(10);
      return res.json({ products: newest || [] });
    }

    const { data: products, error: pErr } = await supabase
      .from('wholesaler_products')
      .select('*, wholesaler:users!wholesaler_id(id, shop_name)')
      .in('id', topIds);

    if (pErr) throw pErr;

    // Re-sort by order count
    const sorted = (products || []).sort((a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0));
    res.json({ products: sorted });
  } catch (error) {
    next(error);
  }
};

const getSellerProfile = async (req, res, next) => {
  const crypto = require('crypto');
  const reqId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const profileId = req.params.id;

  console.log(`[API REQUEST ${reqId}] GET /api/profile/${profileId}`);

  try {
    if (!profileId) {
      console.log(`[API REQUEST ${reqId}] Error: Profile ID parameter is missing`);
      return res.status(400).json({ message: 'Profile ID is required' });
    }

    const userFetch = supabase.from('users')
      .select('id, email, shop_name, role, latitude, longitude, address, city, state, is_profile_complete, created_at')
      .eq('id', profileId)
      .maybeSingle();

    const listingsFetch = supabase.from('wholesaler_products')
      .select('*')
      .eq('wholesaler_id', profileId)
      .gt('stock_available', 0)
      .order('price_per_unit', { ascending: true });

    const connFetch = req.user?.id
      ? supabase.from('connections').select('*').or(`user_id.eq.${req.user.id},connected_user_id.eq.${req.user.id}`)
      : Promise.resolve({ data: [] });

    const [{ data: seller, error: sErr }, { data: listings, error: lErr }, { data: conn }] = await Promise.all([
      userFetch,
      listingsFetch,
      connFetch
    ]);

    console.log(`[API REQUEST ${reqId}] Supabase user query response:`, { seller, error: sErr });
    console.log(`[API REQUEST ${reqId}] Supabase listings query response count:`, listings ? listings.length : 0, { error: lErr });

    if (sErr || !seller) {
      console.error(`[API REQUEST ${reqId}] User not found for id: ${profileId}`, sErr);
      return res.status(404).json({ message: 'User not found' });
    }
    if (lErr) {
      console.error(`[API REQUEST ${reqId}] Listings fetch error for id: ${profileId}`, lErr);
      throw lErr;
    }

    const currentUserId = req.user?.id;
    const isConnected = currentUserId
      ? (conn || []).some(c => 
          (c.user_id === currentUserId && c.connected_user_id === profileId) ||
          (c.user_id === profileId && c.connected_user_id === currentUserId)
        )
      : false;

    console.log(`[API REQUEST ${reqId}] Successfully fetched profile for ${seller.shop_name}, connected: ${isConnected}`);

    res.json({ seller: { ...seller, isConnected }, listings: listings || [] });
  } catch (error) {
    console.error(`[API REQUEST ${reqId}] Error in getSellerProfile:`, error);
    next(error);
  }
};

/**
 * @desc  Reverse geocode coordinates using location service
 * @route POST /api/profile/reverse-geocode
 * body: { latitude, longitude }
 */
const reverseGeocode = async (req, res, next) => {
  try {
    // Accept both { lat, lng } and { latitude, longitude }
    const lat = req.body.lat ?? req.body.latitude;
    const lng = req.body.lng ?? req.body.longitude;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat/lng (or latitude/longitude) are required' });
    }

    const result = await locationService.reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json({
      location: {
        address: result.address,
        city:    result.city,
        state:   result.state,
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateLocation,
  markProfileComplete,
  discoverProfiles,
  getRecommended,
  getTrending,
  getSellerProfile,
  reverseGeocode,
};
