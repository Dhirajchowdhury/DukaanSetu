const cron = require('node-cron');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendLowStockAlert, sendExpiryAlert } = require('../services/email.service');
const { sendLowStockSMS, sendExpirySMS } = require('../services/sms.service');

/**
 * Check for low stock and expiring products
 * Runs daily at 9:00 AM
 */
const checkAlerts = async () => {
  try {
    console.log('🔍 Running alert check...');

    const users = await User.find({ emailVerified: true });

    for (const user of users) {
      // Check low stock products
      const lowStockProducts = await Product.find({
        userId: user._id,
        quantity: { $lte: user.preferences.lowStockThreshold },
      });

      if (lowStockProducts.length > 0) {
        // Send email alert
        if (user.preferences.notifications.email) {
          await sendLowStockAlert(user.email, lowStockProducts);
        }

        // Send SMS for critical items (quantity <= 5)
        if (user.preferences.notifications.sms && user.phoneNumber) {
          const criticalProducts = lowStockProducts.filter(p => p.quantity <= 5);
          for (const product of criticalProducts) {
            await sendLowStockSMS(user.phoneNumber, product.productName, product.quantity);
          }
        }

        // Update alert flags
        await Product.updateMany(
          { _id: { $in: lowStockProducts.map(p => p._id) } },
          { $set: { 'alerts.lowStock': true } }
        );
      }

      // Check expiring products (within 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringProducts = await Product.find({
        userId: user._id,
        expiryDate: {
          $gte: new Date(),
          $lte: sevenDaysFromNow,
        },
      });

      if (expiringProducts.length > 0) {
        // Send email alert
        if (user.preferences.notifications.email) {
          await sendExpiryAlert(user.email, expiringProducts);
        }

        // Send SMS for products expiring in 3 days or less
        if (user.preferences.notifications.sms && user.phoneNumber) {
          const threeDaysFromNow = new Date();
          threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

          const urgentProducts = expiringProducts.filter(p => 
            new Date(p.expiryDate) <= threeDaysFromNow
          );

          for (const product of urgentProducts) {
            const daysLeft = Math.ceil((new Date(product.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            await sendExpirySMS(user.phoneNumber, product.productName, daysLeft);
          }
        }

        // Update alert flags
        await Product.updateMany(
          { _id: { $in: expiringProducts.map(p => p._id) } },
          { $set: { 'alerts.expiringSoon': true } }
        );
      }
    }

    console.log('✅ Alert check completed');
  } catch (error) {
    console.error('❌ Alert check failed:', error);
  }
};

/**
 * Start cron jobs
 */
const start = () => {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', checkAlerts);
  console.log('⏰ Alert scheduler started (runs daily at 9:00 AM)');

  // Run immediately on startup for testing (comment out in production)
  if (process.env.NODE_ENV === 'development') {
    setTimeout(checkAlerts, 5000);
  }
};

module.exports = { start, checkAlerts };
