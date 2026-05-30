require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabase } = require('../config/db');
const { getDistanceKm } = require('../utils/distance');

async function test() {
  const req = {
    user: {
      id: "d84f4b42-8726-424b-8a53-b978d11d12b2", // Dhiraj Chowdhury (shop_owner)
      latitude: 22.989806,
      longitude: 88.451531,
    },
    query: {
      search: "",
      category: "",
      role: "",
      minPrice: "",
      maxPrice: "",
      location: "",
      sortBy: "nearest",
      page: 1,
      limit: 12,
    }
  };

  const { search, category, role, minPrice, maxPrice, location, sortBy, maxDistance, city } = req.query;

  // 1. Fetch from Supabase
  let query = supabase
    .from('users')
    .select(`
      *,
      wholesaler_products:wholesaler_products(*)
    `)
    .in('role', ['wholesaler', 'distributor', 'producer']);

  const { data: users, error } = await query;
  if (error) {
    console.error("Supabase query error:", error);
    return;
  }

  console.log(`Fetched ${users.length} users with supplier roles.`);

  // 2. Fetch connections with original columns
  console.log("Fetching connections using original columns shop_owner_id / wholesaler_id...");
  const { data: userConns, error: connErr } = await supabase
    .from('connections')
    .select('*')
    .or(`shop_owner_id.eq.${req.user.id},wholesaler_id.eq.${req.user.id}`);

  if (connErr) {
    console.error("ERROR: connections query failed:", connErr);
  } else {
    console.log(`Connections fetched successfully:`, userConns);
  }

  const connectedSet = new Set();
  if (userConns) {
    (userConns || []).forEach(c => {
      connectedSet.add(c.shop_owner_id === req.user.id ? c.wholesaler_id : c.shop_owner_id);
    });
  }

  let profiles = [];

  const searchLower = search ? search.toLowerCase() : null;
  const categoryLower = category ? category.toLowerCase() : null;
  const locationLower = location ? location.toLowerCase() : null;
  const minP = minPrice ? parseFloat(minPrice) : null;
  const maxP = maxPrice ? parseFloat(maxPrice) : null;

  const hasCatalogFilters = !!(searchLower || categoryLower || minP !== null || maxP !== null);

  (users || []).forEach(user => {
    console.log(`\nEvaluating User: ${user.shop_name} (ID: ${user.id})`);
    
    // Get active products (stock_available > 0)
    let products = (user.wholesaler_products || []).filter(p => p.stock_available > 0);
    console.log(`- Active products (stock_available > 0): ${products.length} (total wholesaler_products: ${(user.wholesaler_products || []).length})`);

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

    // IF ACTIVE CATALOG FILTERS, and no products matched and the shop name didn't match search, exclude
    if (hasCatalogFilters && products.length === 0 && !matchesSearch) {
      console.log(`- EXCLUDED: Active catalog filters exist, but no products or shop name matched.`);
      return;
    }

    // Location text filter (check user's address or product's location)
    if (locationLower) {
      const addressMatch = user.address?.toLowerCase().includes(locationLower);
      const productLocationMatch = products.some(p => p.location?.toLowerCase().includes(locationLower));
      if (!addressMatch && !productLocationMatch) {
        console.log(`- EXCLUDED: Location filter mismatch.`);
        return;
      }
    }

    // City filter
    if (city) {
      const userLocation = (user.location_name || user.address || '').toLowerCase();
      if (!userLocation.includes(city.toLowerCase())) {
        console.log(`- EXCLUDED: City filter mismatch.`);
        return;
      }
    }

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
    console.log(`- Calculated distance: ${distance} km`);

    // Max Distance filter
    if (maxDistance) {
      const maxD = parseFloat(maxDistance);
      if (distance === null || distance > maxD) {
        console.log(`- EXCLUDED: Max distance filter mismatch.`);
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
      shop_name: user.shop_name,
      distance_km: distance !== null ? Math.round(distance * 10) / 10 : null,
    });
    console.log(`- INCLUDED!`);
  });

  console.log(`\nFinal included profiles (${profiles.length}):`, profiles);
}

test();
