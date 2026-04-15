const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  barcode: {
    type: String,
    index: true,
  },
  productName: {
    type: String,
    required: true,
  },
  brand: String,
  batchNumber: String,
  expiryDate: Date,
  manufactureDate: Date,
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  unit: {
    type: String,
    default: 'pieces',
  },
  costPrice: {
    type: Number,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    min: 0,
  },
  supplier: String,
  lastRestockDate: Date,
  imageUrl: String,
  alerts: {
    lowStock: {
      type: Boolean,
      default: false,
    },
    expiringSoon: {
      type: Boolean,
      default: false,
    },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
productSchema.index({ userId: 1, barcode: 1 });
productSchema.index({ userId: 1, productName: 'text', brand: 'text' });
productSchema.index({ expiryDate: 1 });
productSchema.index({ quantity: 1 });

// Virtual for checking if product is low stock
productSchema.virtual('isLowStock').get(function() {
  return this.quantity <= (this.lowStockThreshold || 10);
});

// Virtual for checking if expiring soon (within 7 days)
productSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiryDate) return false;
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  return this.expiryDate <= sevenDaysFromNow && this.expiryDate > new Date();
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
