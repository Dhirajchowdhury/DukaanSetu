const PriceHistory = require('../models/PriceHistory');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

// @desc    Compare prices across suppliers for a product
// @route   GET /api/pricing/compare?productId=
// @access  Private
exports.comparePrices = async (req, res, next) => {
  try {
    const { productId } = req.query;
    
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Please provide productId' });
    }

    // Find the latest price for each supplier for this product
    // Using aggregation pipeline
    const prices = await PriceHistory.aggregate([
      { $match: { productId: require('mongoose').Types.ObjectId(productId) } },
      { $sort: { date: -1 } },
      { 
        $group: { 
          _id: '$supplierId', 
          latestPrice: { $first: '$price' },
          date: { $first: '$date' }
        } 
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: '$supplierInfo' },
      { $sort: { latestPrice: 1 } } // Sort by price ascending
    ]);

    res.status(200).json({ success: true, count: prices.length, data: prices });
  } catch (error) {
    next(error);
  }
};

// @desc    Get price history for a product
// @route   GET /api/pricing/history/:productId
// @access  Private
exports.getPriceHistory = async (req, res, next) => {
  try {
    const history = await PriceHistory.find({ productId: req.params.productId })
      .populate('supplierId', 'name')
      .sort('date'); // Sort oldest to newest for charts
      
    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new price record
// @route   POST /api/pricing
// @access  Private
exports.addPriceRecord = async (req, res, next) => {
  try {
    const { productId, supplierId, price } = req.body;
    
    const record = await PriceHistory.create({
      productId,
      supplierId,
      price
    });
    
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};
