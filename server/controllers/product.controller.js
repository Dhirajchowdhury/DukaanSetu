const Product = require('../models/Product');
const ScanHistory = require('../models/ScanHistory');

/**
 * @desc    Get all products for user
 * @route   GET /api/products
 * @access  Private
 */
const getProducts = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      sortBy = 'createdAt', 
      order = 'desc',
      stockLevel, // 'low', 'out', 'all'
      expiryRange, // 'week', 'month', 'all'
    } = req.query;

    const query = { userId: req.user._id };

    // Search filter
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    if (category) {
      query.categoryId = category;
    }

    // Stock level filter
    if (stockLevel === 'low') {
      query.quantity = { $lte: req.user.preferences.lowStockThreshold };
    } else if (stockLevel === 'out') {
      query.quantity = 0;
    }

    // Expiry range filter
    if (expiryRange === 'week') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      query.expiryDate = { $gte: new Date(), $lte: sevenDaysFromNow };
    } else if (expiryRange === 'month') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expiryDate = { $gte: new Date(), $lte: thirtyDaysFromNow };
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('categoryId', 'name icon')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Private
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('categoryId', 'name icon');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private
 */
const createProduct = async (req, res, next) => {
  try {
    const productData = {
      ...req.body,
      userId: req.user._id,
    };

    const product = await Product.create(productData);

    // Record scan history if barcode provided
    if (product.barcode) {
      await ScanHistory.create({
        userId: req.user._id,
        productId: product._id,
        barcode: product.barcode,
        action: 'add',
      });
    }

    await product.populate('categoryId', 'name icon');

    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name icon');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Record scan history if barcode exists
    if (product.barcode) {
      await ScanHistory.create({
        userId: req.user._id,
        productId: product._id,
        barcode: product.barcode,
        action: 'update',
      });
    }

    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard stats
 * @route   GET /api/products/stats
 * @access  Private
 */
const getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Total items
    const totalItems = await Product.countDocuments({ userId });

    // Low stock count
    const lowStockCount = await Product.countDocuments({
      userId,
      quantity: { $lte: req.user.preferences.lowStockThreshold },
    });

    // Expiring soon count (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSoonCount = await Product.countDocuments({
      userId,
      expiryDate: { $gte: new Date(), $lte: sevenDaysFromNow },
    });

    // Total inventory value
    const products = await Product.find({ userId });
    const totalValue = products.reduce((sum, p) => sum + (p.sellingPrice || 0) * p.quantity, 0);

    // Category distribution
    const categoryStats = await Product.aggregate([
      { $match: { userId } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { name: '$category.name', icon: '$category.icon', count: 1 } },
    ]);

    res.json({
      totalItems,
      lowStockCount,
      expiringSoonCount,
      totalValue,
      categoryStats,
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
};
