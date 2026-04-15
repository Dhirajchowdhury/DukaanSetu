const mongoose = require('mongoose');

const scanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  barcode: String,
  scannedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  action: {
    type: String,
    enum: ['view', 'update', 'add'],
    required: true,
  },
});

// Index for efficient queries
scanHistorySchema.index({ userId: 1, scannedAt: -1 });

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
