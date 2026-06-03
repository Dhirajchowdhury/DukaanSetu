const cron = require('node-cron');
const { supabase } = require('../config/db');
const { sendOrderNotification } = require('../services/email.service');
const { sendOrderSMS } = require('../services/sms.service');

const checkDues = async () => {
  try {
    console.log('💰 Running pending dues reminder check…');

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const fourtyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, total_price, created_at, delivery_location, payment_status,
        buyer_id, seller_id, last_reminder_sent,
        buyer:users!buyer_id(id, shop_name, email, phone_number),
        seller:users!seller_id(id, shop_name, email, phone_number)
      `)
      .eq('status', 'delivered')
      .neq('payment_status', 'paid')
      .lte('created_at', threeDaysAgo);

    if (error) throw error;
    if (!orders || orders.length === 0) {
      console.log('ℹ️  No pending due orders found');
      return;
    }

    let reminded = 0;
    for (const order of orders) {
      // Skip if reminder was sent in last 48 hours
      if (order.last_reminder_sent && order.last_reminder_sent >= fourtyEightHoursAgo) {
        continue;
      }

      const buyer = order.buyer;
      const seller = order.seller;
      const totalDue = parseFloat(order.total_price || 0);
      const orderRef = order.id.slice(0, 8);

      // Send email reminder
      if (buyer?.email) {
        await sendOrderNotification(
          buyer.email,
          order.id,
          `Payment Reminder: ₹${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} due for order #${orderRef}. Please make the payment at your earliest convenience.`
        );
      }

      // Send SMS reminder
      if (buyer?.phone_number) {
        await sendOrderSMS(
          buyer.phone_number,
          order.id,
          `Payment Reminder: ₹${totalDue.toLocaleString('en-IN')} due for order #${orderRef}.`
        );
      }

      // Log reminder in activity_logs
      await supabase.from('activity_logs').insert({
        user_id: seller?.id || order.seller_id,
        action: 'DUES_REMINDER_SENT',
        entity: 'order',
        entity_id: order.id,
        description: `Dues reminder sent to ${buyer?.shop_name || 'buyer'} for ₹${totalDue}`,
      });

      // Update last_reminder_sent
      await supabase
        .from('orders')
        .update({ last_reminder_sent: new Date().toISOString() })
        .eq('id', order.id);

      reminded++;
    }

    console.log(`✅ Dues reminder check done — ${reminded} reminder(s) sent`);
  } catch (error) {
    console.error('❌ Dues reminder check failed:', error.message);
  }
};

const start = () => {
  cron.schedule('0 10 * * *', checkDues);
  console.log('💰 Dues reminder scheduler started (runs daily at 10:00)');

  if (process.env.NODE_ENV === 'development') {
    setTimeout(checkDues, 10000);
  }
};

module.exports = { start, checkDues };
