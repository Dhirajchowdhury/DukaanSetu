const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isDefault;
    },
  },
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '📦',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Compound index for user-specific categories
categorySchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Category', categorySchema);
