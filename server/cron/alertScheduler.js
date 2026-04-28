const cron = require('node-cron');
const { supabase } = require('../config/db');
const { sendLowStockAlert, sendExpiryAlert } = require('../services/email.service');
const { sendLowStockSMS, sendExpirySMS }     = require('../services/sms.service');

/**
 * Daily alert check — runs at 09:00 every day.
 * Queries Supabase for all verified users, then checks their products.
 */
const checkAlerts = async () => {
  try {
    console.log('🔍 Running daily alert check…');

    // Fetch all email-verified users
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, email, phone_number, notif_email, notif_sms, low_stock_threshold')
      .eq('email_verified', true);

    if (usersErr) throw usersErr;

    const now       = new Date().toISOString();
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    for (const user of users) {
      const threshold = user.low_stock_threshold ?? 10;

      // ── Low stock ──────────────────────────────────────────────────────────
      const { data: lowStockProducts } = await supabase
        .from('products')
        .select('id, product_name, quantity, unit')
        .eq('user_id', user.id)
        .lte('quantity', threshold);

      if (lowStockProducts?.length > 0) {
        if (user.notif_email) {
          await sendLowStockAlert(user.email, lowStockProducts.map(p => ({
            productName: p.product_name,
            quantity:    p.quantity,
            unit:        p.unit,
          })));
        }

        if (user.notif_sms && user.phone_number) {
          const critical = lowStockProducts.filter(p => p.quantity <= 5);
          for (const p of critical) {
            await sendLowStockSMS(user.phone_number, p.product_name, p.quantity);
          }
        }

        // Mark alert flag in DB
        const ids = lowStockProducts.map(p => p.id);
        await supabase
          .from('products')
          .update({ alert_low_stock: true })
          .in('id', ids);
      }

      // ── Expiring soon ──────────────────────────────────────────────────────
      const { data: expiringProducts } = await supabase
        .from('products')
        .select('id, product_name, batch_number, expiry_date')
        .eq('user_id', user.id)
        .gte('expiry_date', now)
        .lte('expiry_date', sevenDays);

      if (expiringProducts?.length > 0) {
        if (user.notif_email) {
          await sendExpiryAlert(user.email, expiringProducts.map(p => ({
            productName: p.product_name,
            batchNumber: p.batch_number,
            expiryDate:  p.expiry_date,
          })));
        }

        if (user.notif_sms && user.phone_number) {
          const urgent = expiringProducts.filter(p => p.expiry_date <= threeDays);
          for (const p of urgent) {
            const daysLeft = Math.ceil(
              (new Date(p.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            await sendExpirySMS(user.phone_number, p.product_name, daysLeft);
          }
        }

        const ids = expiringProducts.map(p => p.id);
        await supabase
          .from('products')
          .update({ alert_expiring_soon: true })
          .in('id', ids);
      }
    }

    console.log('✅ Alert check completed');
  } catch (error) {
    console.error('❌ Alert check failed:', error.message);
  }
};

const start = () => {
  cron.schedule('0 9 * * *', checkAlerts);
  console.log('⏰ Alert scheduler started (runs daily at 09:00)');

  if (process.env.NODE_ENV === 'development') {
    setTimeout(checkAlerts, 5000);
  }
};

module.exports = { start, checkAlerts };
