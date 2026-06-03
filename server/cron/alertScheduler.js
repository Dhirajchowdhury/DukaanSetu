const cron = require('node-cron');
const { supabase } = require('../config/db');
const { sendLowStockAlert, sendExpiryAlert } = require('../services/email.service');
const { sendLowStockSMS, sendExpirySMS }     = require('../services/sms.service');

/**
 * Daily alert check — runs at 09:00 every day.
 */
const checkAlerts = async () => {
  try {
    console.log('🔍 Running daily alert check…');

    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, email, phone_number, notif_email, notif_sms')
      .eq('email_verified', true);

    if (usersErr) throw usersErr;

    const now       = new Date().toISOString();
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    for (const user of users) {
      // ── Low stock ─────────────────────────────────────────────────────────
      const { data: allUserProducts } = await supabase
        .from('products')
        .select('id, product_name, quantity, unit, low_stock_threshold, low_stock_alert_enabled')
        .eq('user_id', user.id);

      const lowStockProducts = (allUserProducts || []).filter(
        p => p.low_stock_alert_enabled && p.quantity <= p.low_stock_threshold
      );

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
        const ids = lowStockProducts.map(p => p.id);
        await supabase.from('products').update({ alert_low_stock: true }).in('id', ids);
      }

      // ── Expiring soon ─────────────────────────────────────────────────────
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
        await supabase.from('products').update({ alert_expiring_soon: true }).in('id', ids);
      }
    }

    console.log('✅ Alert check completed');
  } catch (error) {
    console.error('❌ Alert check failed:', error.message);
  }
};

/**
 * Auto-reorder check — runs every 6 hours.
 * For each active rule, if supplier's stock <= trigger_qty and no pending draft exists,
 * creates a draft_order awaiting retailer approval.
 */
const checkAutoReorder = async () => {
  try {
    console.log('🔄 Running auto-reorder check…');

    const { data: rules, error: rulesErr } = await supabase
      .from('reorder_rules')
      .select(`
        id, user_id, supplier_id, reorder_qty, trigger_qty, last_triggered_at,
        product:wholesaler_products!product_id(
          id, product_name, price_per_unit, moq, stock_available, unit
        )
      `)
      .eq('is_active', true);

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      console.log('ℹ️  No active reorder rules found');
      return;
    }

    const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12h cooldown between triggers
    const now = Date.now();
    let drafted = 0;

    for (const rule of rules) {
      try {
        // Cooldown guard
        if (rule.last_triggered_at) {
          if (now - new Date(rule.last_triggered_at).getTime() < COOLDOWN_MS) continue;
        }

        const product = rule.product;
        if (!product) continue;

        // Trigger condition: supplier stock at or below threshold
        if (product.stock_available > rule.trigger_qty) continue;

        // Skip if a pending draft already exists for this rule
        const { data: existingDraft } = await supabase
          .from('draft_orders')
          .select('id')
          .eq('rule_id', rule.id)
          .eq('status', 'pending_approval')
          .maybeSingle();

        if (existingDraft) continue;

        const qty        = Math.max(rule.reorder_qty, product.moq || 1);
        const unitPrice  = parseFloat(product.price_per_unit || 0);
        const totalPrice = unitPrice * qty;

        const { error: insertErr } = await supabase.from('draft_orders').insert({
          rule_id:     rule.id,
          buyer_id:    rule.user_id,
          seller_id:   rule.supplier_id,
          product_id:  product.id,
          quantity:    qty,
          unit_price:  unitPrice,
          total_price: totalPrice,
          status:      'pending_approval',
        });

        if (insertErr) {
          console.error(`❌ Draft insert failed for rule ${rule.id}:`, insertErr.message);
          continue;
        }

        await supabase
          .from('reorder_rules')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', rule.id);

        drafted++;
        console.log(`📦 Draft created: ${product.product_name} × ${qty} → user ${rule.user_id}`);
      } catch (ruleErr) {
        console.error(`❌ Rule ${rule.id} error:`, ruleErr.message);
      }
    }

    console.log(`✅ Auto-reorder done — ${drafted} draft(s) created`);
  } catch (error) {
    console.error('❌ Auto-reorder check failed:', error.message);
  }
};

const start = () => {
  // Daily stock & expiry alerts
  cron.schedule('0 9 * * *', checkAlerts);
  console.log('⏰ Alert scheduler started (runs daily at 09:00)');

  // Auto-reorder check every 6 hours
  cron.schedule('0 */6 * * *', checkAutoReorder);
  console.log('🔄 Auto-reorder scheduler started (runs every 6 hours)');

  if (process.env.NODE_ENV === 'development') {
    setTimeout(checkAlerts, 5000);
    setTimeout(checkAutoReorder, 8000);
  }
};

module.exports = { start, checkAlerts, checkAutoReorder };
