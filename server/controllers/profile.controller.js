const { supabase } = require('../config/db');

/* ── Haversine distance (km) ─────────────────────────────────────────────── */
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
        distance = haversine(
          currentUser.latitude, currentUser.longitude,
          item.wholesaler.latitude, item.wholesaler.longitude
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
    topProducts:  [...p.products]
      .sort((a, b) => a.price_per_unit - b.price_per_unit)
      .slice(0, 3)
      .map(({ id, product_name, price_per_unit, unit }) => ({ id, product_name, price_per_unit, unit })),
  }));
};

/**
 * @desc  Update current user's location + mark profile complete
 * @route PUT /api/profile/location
 */
const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, address } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .update({ latitude, longitude, address: address || null })
      .eq('id', req.user.id)
      .select('id, latitude, longitude, address, is_profile_complete')
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
    } = req.query;

    let query = supabase
      .from('users')
      .select(`
        *,
        wholesaler_products:wholesaler_products(*)
      `)
      .in('role', ['wholesaler', 'distributor', 'producer']);

    if (role && role !== 'all' && role !== '') {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    // Post-process and filter in memory
    let profiles = [];

    const searchLower = search ? search.toLowerCase() : null;
    const categoryLower = category ? category.toLowerCase() : null;
    const locationLower = location ? location.toLowerCase() : null;
    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;

    const hasCatalogFilters = !!(searchLower || categoryLower || minP !== null || maxP !== null);

    (users || []).forEach(user => {
      // Get active products (stock_available > 0)
      let products = (user.wholesaler_products || []).filter(p => p.stock_available > 0);

      // Apply product and search filters
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

      // If active catalog filters, and no products matched and the shop name didn't match search, exclude
      if (hasCatalogFilters && products.length === 0 && !matchesSearch) {
        return;
      }

      // Location filter (check user's address or product's location)
      if (locationLower) {
        const addressMatch = user.address?.toLowerCase().includes(locationLower);
        const productLocationMatch = products.some(p => p.location?.toLowerCase().includes(locationLower));
        if (!addressMatch && !productLocationMatch) {
          return;
        }
      }

      // Calculate distance
      let distance = null;
      if (
        req.user?.latitude && req.user?.longitude &&
        user.latitude && user.longitude
      ) {
        distance = haversine(
          req.user.latitude, req.user.longitude,
          user.latitude, user.longitude
        );
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
        shop_name: user.shop_name,
        role: user.role,
        latitude: user.latitude,
        longitude: user.longitude,
        address: user.address,
        is_profile_complete: user.is_profile_complete,
        total_products: products.length,
        min_price: minPriceVal === Infinity ? 0 : minPriceVal,
        max_price: maxPriceVal === -Infinity ? 0 : maxPriceVal,
        // Backward compatibility:
        wholesaler: {
          id: user.id,
          shop_name: user.shop_name,
          role: user.role,
          latitude: user.latitude,
          longitude: user.longitude,
          address: user.address,
          is_profile_complete: user.is_profile_complete,
        },
        productCount: products.length,
        minPrice: minPriceVal === Infinity ? 0 : minPriceVal,
        maxPrice: maxPriceVal === -Infinity ? 0 : maxPriceVal,
        distance: distance !== null ? Math.round(distance * 10) / 10 : null,
        topProducts: [...products]
          .sort((a, b) => a.price_per_unit - b.price_per_unit)
          .slice(0, 3)
          .map(({ id, product_name, price_per_unit, unit }) => ({ id, product_name, price_per_unit, unit })),
      });
    });

    // Sort
    if (sortBy === 'nearest') {
      profiles.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (sortBy === 'lowest_price') {
      profiles.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sortBy === 'recommended') {
      const distances = profiles.map(p => p.distance).filter(d => d !== null);
      const maxDist = distances.length > 0 ? Math.max(...distances, 1) : 1;
      const counts = profiles.map(p => p.productCount);
      const maxCount = counts.length > 0 ? Math.max(...counts, 1) : 1;

      profiles.forEach(p => {
        const distScore = p.distance !== null ? p.distance / maxDist : 0.5;
        const countScore = maxCount > 0 ? 1 - p.productCount / maxCount : 0.5;
        p._score = 0.6 * distScore + 0.4 * countScore;
      });
      profiles.sort((a, b) => a._score - b._score);
    } else {
      profiles.sort((a, b) => (a.wholesaler?.shop_name || '').localeCompare(b.wholesaler?.shop_name || ''));
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
        *,
        wholesaler_products:wholesaler_products(*)
      `)
      .in('role', ['wholesaler', 'distributor', 'producer']);

    const { data: users, error } = await query;
    if (error) throw error;

    let profiles = [];

    (users || []).forEach(user => {
      let products = (user.wholesaler_products || []).filter(p => p.stock_available > 0);

      // Calculate distance
      let distance = null;
      if (
        req.user?.latitude && req.user?.longitude &&
        user.latitude && user.longitude
      ) {
        distance = haversine(
          req.user.latitude, req.user.longitude,
          user.latitude, user.longitude
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
        shop_name: user.shop_name,
        role: user.role,
        latitude: user.latitude,
        longitude: user.longitude,
        address: user.address,
        is_profile_complete: user.is_profile_complete,
        total_products: products.length,
        min_price: minPriceVal === Infinity ? 0 : minPriceVal,
        max_price: maxPriceVal === -Infinity ? 0 : maxPriceVal,
        // Backward compatibility:
        wholesaler: {
          id: user.id,
          shop_name: user.shop_name,
          role: user.role,
          latitude: user.latitude,
          longitude: user.longitude,
          address: user.address,
          is_profile_complete: user.is_profile_complete,
        },
        productCount: products.length,
        minPrice: minPriceVal === Infinity ? 0 : minPriceVal,
        maxPrice: maxPriceVal === -Infinity ? 0 : maxPriceVal,
        distance: distance !== null ? Math.round(distance * 10) / 10 : null,
        topProducts: [...products]
          .sort((a, b) => a.price_per_unit - b.price_per_unit)
          .slice(0, 3)
          .map(({ id, product_name, price_per_unit, unit }) => ({ id, product_name, price_per_unit, unit })),
      });
    });

    const distances = profiles.map(p => p.distance).filter(d => d !== null);
    const maxDist = distances.length > 0 ? Math.max(...distances, 1) : 1;
    const counts = profiles.map(p => p.productCount);
    const maxCount = counts.length > 0 ? Math.max(...counts, 1) : 1;

    profiles.forEach(p => {
      const distScore = p.distance !== null ? p.distance / maxDist : 0.5;
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

/**
 * @desc  Get a single seller's public profile + listings
 * @route GET /api/profile/:userId
 */
const getSellerProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [{ data: seller, error: sErr }, { data: listings, error: lErr }] = await Promise.all([
      supabase.from('users')
        .select('id, shop_name, role, latitude, longitude, address, created_at')
        .eq('id', userId).single(),
      supabase.from('wholesaler_products')
        .select('*').eq('wholesaler_id', userId)
        .gt('stock_available', 0).order('price_per_unit', { ascending: true }),
    ]);

    if (sErr || !seller) return res.status(404).json({ message: 'User not found' });
    if (lErr) throw lErr;

    res.json({ seller, listings: listings || [] });
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
};
