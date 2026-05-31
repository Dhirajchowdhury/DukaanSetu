const express = require('express');
const router = express.Router({ mergeParams: true });

// Items are managed through the orders controller
// GET    /api/orders/:orderId/items
// POST   /api/orders/:orderId/items
// DELETE /api/orders/:orderId/items/:itemId

router.get('/', async (req, res, next) => {
  try {
    const { supabase } = require('../config/db');
    const { data } = await supabase
      .from('order_items')
      .select(`
        id, quantity, price,
        product:wholesaler_products!product_id(id, product_name, price_per_unit, unit, category)
      `)
      .eq('order_id', req.params.orderId);
    res.json({ items: data || [] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
