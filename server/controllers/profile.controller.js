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

    const searchLower = search ? search.toLowerCase() : null;
    const categoryLower = category ? category.toLowerCase() : null;
    const locationLower = location ? location.toLowerCase() : null;
    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;

    const hasCatalogFilters = !!(searchLower || categoryLower || minP !== null || maxP !== null);

    // Build optimized database query string
    let selectString = `
      id, email, shop_name, role, latitude, longitude, address, city, state, is_profile_complete, created_at,
      wholesaler_products:wholesaler_products(*)
    `;

    // Move basic product existence filter to DB query using !inner join when catalog filters are active
    if (hasCatalogFilters) {
      selectString = `
        id, email, shop_name, role, latitude, longitude, address, city, state, is_profile_complete, created_at,
        wholesaler_products:wholesaler_products!inner(*)
      `;
    }

    let query = supabase
      .from('users')
      .select(selectString)
      .in('role', ['wholesaler', 'distributor', 'producer']);

    // Move basic role filter to DB query
    if (role && role !== 'all' && role !== '') {
      query = query.eq('role', role);
    }

    // Move basic catalog filters directly to DB query
    if (categoryLower) {
      query = query.ilike('wholesaler_products.category', `%${category}%`);
    }
    if (minP !== null) {
      query = query.gte('wholesaler_products.price_per_unit', minP);
    }
    if (maxP !== null) {
      query = query.lte('wholesaler_products.price_per_unit', maxP);
    }

    const { data: users, error } = await query;
    if (error) {
      console.error("[B2B DISCOVER] users query failed:", error);
      throw error;
    }

    // Log count before filtering
    console.log(`[B2B DISCOVER] Suppliers count before filtering: ${users ? users.length : 0}`);

    // Fetch connections using correct Supabase columns
    const { data: userConns, error: connErr } = await supabase
      .from('connections')
      .select('*')
      .or(`user_id.eq.${req.user.id},connected_user_id.eq.${req.user.id}`);

    if (connErr) {
      console.warn("[B2B DISCOVER] Supabase connections query encountered an error:", connErr.message);
    }

    const connectedSet = new Set();
    (userConns || []).forEach(c => {
      connectedSet.add(c.user_id === req.user.id ? c.connected_user_id : c.user_id);
    });

    let profiles = [];

    (users || []).forEach(user => {
      // Product join existence: active products (stock_available > 0)
      let products = (user.wholesaler_products || []).filter(p => p.stock_available > 0);

      // Search matching logic on product and shop name
      let matchesSearch = false;
      if (searchLower) {
        if (user.shop_name?.toLowerCase().includes(searchLower)) {
          matchesSearch = true;
        } else {
          products = products.filter(p =>
            p.product_name?.toLowerCase().includes(searchLower) ||
            p.category?.toLowerCase().includes(searchLower)
          );
        }
      }

      if (categoryLower) {
        products = products.filter(p => p.category?.toLowerCase().includes(categoryLower));
      }

      if (minP !== null) {
        products = products.filter(p => p.price_per_unit >= minP);
      }

      if (maxP !== null) {
        products = products.filter(p => p.price_per_unit <= maxP);
      }

      // Ensure zero product count doesn't hide supplier unless catalog searching is active
      if (hasCatalogFilters && products.length === 0 && !matchesSearch) {
        return;
      }

      // Text-based location filters
      if (locationLower) {
        const addressMatch = user.address?.toLowerCase().includes(locationLower);
        const productLocationMatch = products.some(p => p.location?.toLowerCase().includes(locationLower));
        if (!addressMatch && !productLocationMatch) {
          return;
        }
      }

      if (city) {
        const userLocation = (user.location_name || user.address || '').toLowerCase();
        if (!userLocation.includes(city.toLowerCase())) {
          return;
        }
      }

      // Keep advanced filters (distance proximity calc) in JS
      let distance = null;
      const hasGPS = req.user?.latitude != null && req.user?.longitude != null &&
                     user.latitude != null && user.longitude != null;

      if (hasGPS) {
        distance = getDistanceKm(
          parseFloat(req.user.latitude),
          parseFloat(req.user.longitude),
          parseFloat(user.latitude),
          parseFloat(user.longitude)
        );
      }

      // Max Distance filter — only apply if GPS coordinates exist
      if (maxDistance && hasGPS) {
        const maxD = parseFloat(maxDistance);
        if (distance === null || distance > maxD) {
          return;
        }
      }

      // Calculate price ranges & aggregates
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
        city: user.city || null,
        state: user.state || null,
        is_profile_complete: user.is_profile_complete,
        isConnected: connectedSet.has(user.id),
        total_products: products.length,
        min_price: minPriceVal === Infinity ? 0 : minPriceVal,
        max_price: maxPriceVal === -Infinity ? 0 : maxPriceVal,
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
          city: user.city || null,
          state: user.state || null,
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

    // Log count after filtering
    console.log(`[B2B DISCOVER] Suppliers count after filtering: ${profiles.length}`);

    // Sort
    if (sortBy === 'nearest') {
      profiles.sort((a, b) => {
        if (a.distance_km === null && b.distance_km === null) return 0;
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    } else if (sortBy === 'lowest_price') {
      profiles.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sortBy === 'recommended') {
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
    } else {
      profiles.sort((a, b) => (a.shop_name || '').localeCompare(b.shop_name || ''));
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const total = profiles.length;
    const paged = profiles.slice(from, from + parseInt(limit));

    res.json({
      profiles: paged,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
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
  try {
    const userId = req.params.id || req.params.userId;
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      console.log(`[getSellerProfile] Fetching profile for id: ${userId}`);
    }

    const userFetch = supabase.from('users')
      .select('id, email, shop_name, role, latitude, longitude, address, city, state, is_profile_complete, created_at')
      .eq('id', userId)
      .single();

    const listingsFetch = supabase.from('wholesaler_products')
      .select('*')
      .eq('wholesaler_id', userId)
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

    if (sErr || !seller) {
      if (isDev) {
        console.error(`[getSellerProfile] User not found for id: ${userId}`, sErr);
      }
      return res.status(404).json({ message: 'User not found' });
    }
    if (lErr) {
      if (isDev) {
        console.error(`[getSellerProfile] Listings fetch error for id: ${userId}`, lErr);
      }
      throw lErr;
    }

    const currentUserId = req.user?.id;
    const isConnected = currentUserId
      ? (conn || []).some(c => 
          (c.user_id === currentUserId && c.connected_user_id === userId) ||
          (c.user_id === userId && c.connected_user_id === currentUserId)
        )
      : false;

    if (isDev) {
      console.log(`[getSellerProfile] Successfully fetched profile for ${seller.shop_name}`);
    }

    res.json({ seller: { ...seller, isConnected }, listings: listings || [] });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("[getSellerProfile] Error:", error);
    }
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
