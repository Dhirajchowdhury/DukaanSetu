const Product = require('../models/Product');
const ScanHistory = require('../models/ScanHistory');
const { lookupBarcode } = require('../services/barcode.service');

/**
 * @desc    Lookup product by barcode
 * @route   POST /api/barcode/lookup
 * @access  Private
 */
const lookupProduct = async (req, res, next) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ message: 'Barcode is required' });
    }

    // First check if product exists in user's inventory
    const existingProduct = await Product.findOne({
      userId: req.user._id,
      barcode,
    }).populate('categoryId', 'name icon');

    if (existingProduct) {
      return res.json({
        found: true,
        source: 'inventory',
        product: existingProduct,
      });
    }

    // If not found, lookup from external API
    const apiData = await lookupBarcode(barcode);

    if (apiData) {
      return res.json({
        found: true,
        source: 'api',
        product: apiData,
      });
    }

    res.json({
      found: false,
      message: 'Product not found. You can add it manually.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record barcode scan
 * @route   POST /api/barcode/scan
 * @access  Private
 */
const recordScan = async (req, res, next) => {
  try {
    const { barcode, productId, action } = req.body;

    await ScanHistory.create({
      userId: req.user._id,
      productId,
      barcode,
      action: action || 'view',
    });

    res.json({ message: 'Scan recorded successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  lookupProduct,
  recordScan,
};
