const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  }
});

// Compound index to quickly find prices for a specific product from a specific supplier
priceHistorySchema.index({ productId: 1, supplierId: 1, date: -1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
