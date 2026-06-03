const { supabase } = require('../config/db');

/**
 * @desc  Browse wholesaler products (the "Connect" marketplace)
 * @route GET /api/connect
 * @query search, category, sortBy (price|name), order (asc|desc), page, limit
 */
const getWholesalerProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      wholesalerId,            // NEW: filter by specific supplier
      sortBy  = 'price_per_unit',
      order   = 'asc',
      page    = 1,
      limit   = wholesalerId ? 100 : 20,  // fetch all when loading for a specific supplier
    } = req.query;

    const ascending = order !== 'desc';
    const col       = sortBy === 'name' ? 'product_name' : 'price_per_unit';
    const from      = (parseInt(page) - 1) * parseInt(limit);
    const to        = from + parseInt(limit) - 1;

    let query = supabase
      .from('wholesaler_products')
      .select(`
        *,
        wholesaler:users!wholesaler_id(id, shop_name, phone_number, role)
      `, { count: 'exact' })
      .gt('stock_available', 0)
      .order(col, { ascending })
      .range(from, to);

    if (wholesalerId) {
      query = query.eq('wholesaler_id', wholesalerId);
    }
    if (search) {
      query = query.ilike('product_name', `%${search}%`);
    }
    if (category) {
      query = query.ilike('category', `%${category}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      products: data,
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  List my own wholesaler products (for wholesaler/producer dashboard)
 * @route GET /api/connect/my-listings
 */
const getMyListings = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('wholesaler_products')
      .select('*')
      .eq('wholesaler_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ products: data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Create a wholesaler product listing
 * @route POST /api/connect/my-listings
 */
const createListing = async (req, res, next) => {
  try {
    const { productName, category, pricePerUnit, moq, stockAvailable, unit, location, description } = req.body;

    if (!['wholesaler', 'producer', 'distributor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only wholesalers, producers, and distributors can create listings' });
    }

    const { data, error } = await supabase
      .from('wholesaler_products')
      .insert({
        wholesaler_id:   req.user.id,
        product_name:    productName,
        category:        category    || 'General',
        price_per_unit:  pricePerUnit,
        moq:             moq         || 1,
        stock_available: stockAvailable ?? 0,
        unit:            unit        || 'pieces',
        location:        location    || null,
        description:     description || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Listing created', product: data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update a wholesaler product listing
 * @route PUT /api/connect/my-listings/:id
 */
const updateListing = async (req, res, next) => {
  try {
    const { productName, category, pricePerUnit, moq, stockAvailable, unit, location, description } = req.body;
    const updates = {};
    if (productName    !== undefined) updates.product_name    = productName;
    if (category       !== undefined) updates.category        = category;
    if (pricePerUnit   !== undefined) updates.price_per_unit  = pricePerUnit;
    if (moq            !== undefined) updates.moq             = moq;
    if (stockAvailable !== undefined) updates.stock_available = stockAvailable;
    if (unit           !== undefined) updates.unit            = unit;
    if (location       !== undefined) updates.location        = location;
    if (description    !== undefined) updates.description     = description;

    const { data, error } = await supabase
      .from('wholesaler_products')
      .update(updates)
      .eq('id', req.params.id)
      .eq('wholesaler_id', req.user.id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ message: 'Listing not found' });
    res.json({ message: 'Listing updated', product: data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete a wholesaler product listing
 * @route DELETE /api/connect/my-listings/:id
 */
const deleteListing = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('wholesaler_products')
      .delete()
      .eq('id', req.params.id)
      .eq('wholesaler_id', req.user.id)
      .select('id')
      .single();

    if (error || !data) return res.status(404).json({ message: 'Listing not found' });
    res.json({ message: 'Listing deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWholesalerProducts,
  getMyListings,
  createListing,
  updateListing,
  deleteListing,
};
