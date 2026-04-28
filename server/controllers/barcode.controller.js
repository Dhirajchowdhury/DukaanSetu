const { supabase } = require('../config/db');
const { lookupBarcode } = require('../services/barcode.service');

/**
 * @desc  Lookup product by barcode
 * @route POST /api/barcode/lookup
 */
const lookupProduct = async (req, res, next) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ message: 'Barcode is required' });
    }

    // Check user's own inventory first
    const { data: existing } = await supabase
      .from('products')
      .select('*, categories(name, icon)')
      .eq('user_id', req.user.id)
      .eq('barcode', barcode)
      .maybeSingle();

    if (existing) {
      return res.json({
        found:   true,
        source:  'inventory',
        product: existing,
      });
    }

    // Fall back to external barcode API
    const apiData = await lookupBarcode(barcode);

    if (apiData) {
      return res.json({ found: true, source: 'api', product: apiData });
    }

    res.json({ found: false, message: 'Product not found. You can add it manually.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Record a barcode scan event
 * @route POST /api/barcode/scan
 */
const recordScan = async (req, res, next) => {
  try {
    const { barcode, productId, action } = req.body;

    const { error } = await supabase.from('scan_history').insert({
      user_id:    req.user.id,
      product_id: productId || null,
      barcode:    barcode   || null,
      action:     action    || 'view',
    });

    if (error) throw error;

    res.json({ message: 'Scan recorded successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { lookupProduct, recordScan };
