const { supabase } = require('../config/db');

// ── helpers ──────────────────────────────────────────────────────────────────

/** Compute virtual fields that Mongoose used to provide */
const withVirtuals = (product, threshold = 10) => {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    ...product,
    // Flatten nested category join → match old Mongoose populate shape
    categoryId: product.categories
      ? { _id: product.category_id, id: product.category_id, name: product.categories.name, icon: product.categories.icon }
      : null,
    isLowStock:     product.quantity <= threshold,
    isExpiringSoon: product.expiry_date
      ? new Date(product.expiry_date) <= sevenDays && new Date(product.expiry_date) > now
      : false,
    // camelCase aliases for frontend compatibility
    productName:     product.product_name,
    batchNumber:     product.batch_number,
    expiryDate:      product.expiry_date,
    manufactureDate: product.manufacture_date,
    costPrice:       product.cost_price,
    sellingPrice:    product.selling_price,
    lastRestockDate: product.last_restock_date,
    imageUrl:        product.image_url,
    createdAt:       product.created_at,
    updatedAt:       product.updated_at,
  };
};

/** Column name map for sort fields coming from the frontend */
const SORT_MAP = {
  createdAt:    'created_at',
  productName:  'product_name',
  quantity:     'quantity',
  expiryDate:   'expiry_date',
  sellingPrice: 'selling_price',
};

// ── controllers ───────────────────────────────────────────────────────────────

/**
 * @desc  Get all products for the authenticated user
 * @route GET /api/products
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      page       = 1,
      limit      = 20,
      search,
      category,
      sortBy     = 'createdAt',
      order      = 'desc',
      stockLevel,   // 'low' | 'out'
      expiryRange,  // 'week' | 'month'
    } = req.query;

    const threshold = req.user.preferences?.lowStockThreshold ?? 10;
    const userId    = req.user.id;
    const col       = SORT_MAP[sortBy] || 'created_at';
    const ascending = order === 'asc';
    const from      = (parseInt(page) - 1) * parseInt(limit);
    const to        = from + parseInt(limit) - 1;

    let query = supabase
      .from('products')
      .select('*, categories(name, icon)', { count: 'exact' })
      .eq('user_id', userId)
      .order(col, { ascending })
      .range(from, to);

    // Search (product_name OR brand OR barcode)
    if (search) {
      query = query.or(
        `product_name.ilike.%${search}%,brand.ilike.%${search}%,barcode.ilike.%${search}%`
      );
    }

    // Category filter
    if (category) {
      query = query.eq('category_id', category);
    }

    // Stock level filter
    if (stockLevel === 'out') {
      query = query.eq('quantity', 0);
    } else if (stockLevel === 'low') {
      query = query.lte('quantity', threshold).gt('quantity', 0);
    }

    // Expiry range filter
    if (expiryRange === 'week' || expiryRange === 'month') {
      const days = expiryRange === 'week' ? 7 : 30;
      const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      query = query
        .gte('expiry_date', new Date().toISOString())
        .lte('expiry_date', future);
    }

    const { data: products, error, count } = await query;
    if (error) throw error;

    res.json({
      products: products.map(p => withVirtuals(p, threshold)),
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
 * @desc  Get single product
 * @route GET /api/products/:id
 */
const getProduct = async (req, res, next) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(name, icon)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const threshold = req.user.preferences?.lowStockThreshold ?? 10;
    res.json({ product: withVirtuals(product, threshold) });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Create new product
 * @route POST /api/products
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      productName, categoryId, barcode, brand, batchNumber,
      expiryDate, manufactureDate, quantity, unit,
      costPrice, sellingPrice, supplier, imageUrl,
    } = req.body;

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        user_id:          req.user.id,
        category_id:      categoryId,
        product_name:     productName,
        barcode:          barcode   || null,
        brand:            brand     || null,
        batch_number:     batchNumber || null,
        expiry_date:      expiryDate  || null,
        manufacture_date: manufactureDate || null,
        quantity:         quantity ?? 0,
        unit:             unit || 'pieces',
        cost_price:       costPrice    || null,
        selling_price:    sellingPrice || null,
        supplier:         supplier  || null,
        image_url:        imageUrl  || null,
      })
      .select('*, categories(name, icon)')
      .single();

    if (error) throw error;

    // Record scan history if barcode provided
    if (barcode) {
      await supabase.from('scan_history').insert({
        user_id:    req.user.id,
        product_id: product.id,
        barcode,
        action:     'add',
      });
    }

    const threshold = req.user.preferences?.lowStockThreshold ?? 10;
    res.status(201).json({
      message: 'Product created successfully',
      product: withVirtuals(product, threshold),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update product
 * @route PUT /api/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const {
      productName, categoryId, barcode, brand, batchNumber,
      expiryDate, manufactureDate, quantity, unit,
      costPrice, sellingPrice, supplier, imageUrl,
    } = req.body;

    // Build update object — only include defined fields
    const updates = {};
    if (productName     !== undefined) updates.product_name     = productName;
    if (categoryId      !== undefined) updates.category_id      = categoryId;
    if (barcode         !== undefined) updates.barcode          = barcode;
    if (brand           !== undefined) updates.brand            = brand;
    if (batchNumber     !== undefined) updates.batch_number     = batchNumber;
    if (expiryDate      !== undefined) updates.expiry_date      = expiryDate || null;
    if (manufactureDate !== undefined) updates.manufacture_date = manufactureDate || null;
    if (quantity        !== undefined) updates.quantity         = quantity;
    if (unit            !== undefined) updates.unit             = unit;
    if (costPrice       !== undefined) updates.cost_price       = costPrice;
    if (sellingPrice    !== undefined) updates.selling_price    = sellingPrice;
    if (supplier        !== undefined) updates.supplier         = supplier;
    if (imageUrl        !== undefined) updates.image_url        = imageUrl;

    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('*, categories(name, icon)')
      .single();

    if (error || !product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Record scan history
    if (product.barcode) {
      await supabase.from('scan_history').insert({
        user_id:    req.user.id,
        product_id: product.id,
        barcode:    product.barcode,
        action:     'update',
      });
    }

    const threshold = req.user.preferences?.lowStockThreshold ?? 10;
    res.json({
      message: 'Product updated successfully',
      product: withVirtuals(product, threshold),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete product
 * @route DELETE /api/products/:id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id')
      .single();

    if (error || !product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Dashboard stats
 * @route GET /api/products/stats
 */
const getStats = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const threshold = req.user.preferences?.lowStockThreshold ?? 10;
    const now       = new Date().toISOString();
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run all counts in parallel
    const [
      { count: totalItems },
      { count: lowStockCount },
      { count: expiringSoonCount },
      { data: valueRows },
      { data: catRows },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('products').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).lte('quantity', threshold),
      supabase.from('products').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).gte('expiry_date', now).lte('expiry_date', sevenDays),
      supabase.from('products').select('selling_price, quantity').eq('user_id', userId),
      supabase.from('products')
        .select('category_id, categories(name, icon)')
        .eq('user_id', userId),
    ]);

    // Total inventory value
    const totalValue = (valueRows || []).reduce(
      (sum, p) => sum + (p.selling_price || 0) * (p.quantity || 0), 0
    );

    // Category distribution
    const catMap = {};
    (catRows || []).forEach(p => {
      const key = p.category_id;
      if (!catMap[key]) {
        catMap[key] = {
          _id:   key,
          name:  p.categories?.name || 'Unknown',
          icon:  p.categories?.icon || '📦',
          count: 0,
        };
      }
      catMap[key].count++;
    });

    res.json({
      totalItems:       totalItems  || 0,
      lowStockCount:    lowStockCount || 0,
      expiringSoonCount: expiringSoonCount || 0,
      totalValue,
      categoryStats: Object.values(catMap),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Manual stock correction
 * @route PATCH /api/products/:id/stock
 */
const adjustStock = async (req, res, next) => {
  try {
    const { adjustment, reason } = req.body;
    if (typeof adjustment !== 'number') {
      return res.status(400).json({ message: 'adjustment must be a number' });
    }

    // Fetch current quantity first
    const { data: current, error: fetchErr } = await supabase
      .from('products')
      .select('id, quantity, barcode')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !current) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newQty = current.quantity + adjustment;
    if (newQty < 0) {
      return res.status(400).json({ message: 'Stock cannot go below 0' });
    }

    const updates = { quantity: newQty };
    if (adjustment > 0) updates.last_restock_date = new Date().toISOString();

    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('*, categories(name, icon)')
      .single();

    if (error) throw error;

    const threshold = req.user.preferences?.lowStockThreshold ?? 10;
    res.json({
      message: 'Stock adjusted',
      product: withVirtuals(product, threshold),
      adjustment,
      reason,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getStats,
  adjustStock,
};
