const { supabase } = require('../config/db');
const { sendOrderNotification } = require('./email.service');

async function checkFraud(orderId, buyerId, sellerId, totalPrice, items) {
  try {
    const flags = [];

    // Rule 1: Same buyer > 5 orders in 1 hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', buyerId)
      .gte('created_at', oneHourAgo);

    if (recentCount > 5) {
      flags.push('More than 5 orders in 1 hour');
    }

    // Rule 2: Total > 5x buyer's average order value
    const { data: pastOrders } = await supabase
      .from('orders')
      .select('total_price')
      .eq('buyer_id', buyerId)
      .not('id', 'eq', orderId);

    if (pastOrders && pastOrders.length > 0) {
      const avg = pastOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0) / pastOrders.length;
      if (totalPrice > avg * 5) {
        flags.push(`Order total ${totalPrice} is >5x buyer's average ${avg.toFixed(2)}`);
      }
    }

    // Rule 3: New account (<7 days) above ₹50,000
    const { data: buyer } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', buyerId)
      .single();

    if (buyer) {
      const accountAgeDays = (Date.now() - new Date(buyer.created_at).getTime()) / 86400000;
      if (accountAgeDays < 7 && totalPrice > 50000) {
        flags.push('New account (<7 days) ordering above ₹50,000');
      }
    }

    // Rule 4: Same product >10x usual quantity
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: prevItems } = await supabase
          .from('order_items')
          .select('quantity')
          .eq('product_id', item.productId || item.product_id);

        if (prevItems && prevItems.length > 0) {
          const avgQty = prevItems.reduce((s, i) => s + (i.quantity || 0), 0) / prevItems.length;
          if (avgQty > 0 && (item.quantity || 0) > avgQty * 10) {
            flags.push(`Product ${item.productId || item.product_id} qty ${item.quantity} is >10x usual ${avgQty.toFixed(1)}`);
          }
        }
      }
    }

    if (flags.length > 0) {
      await supabase.from('orders').update({ fraud_flag: true }).eq('id', orderId);

      const { data: seller } = await supabase
        .from('users')
        .select('email, shop_name')
        .eq('id', sellerId)
        .single();

      if (seller?.email) {
        sendOrderNotification(seller.email, orderId, `⚠️ Fraud alert on order #${orderId.slice(0, 8)}: ${flags.join('; ')}`);
      }
    }

    return flags;
  } catch (error) {
    console.error('Fraud check error:', error.message);
    return [];
  }
}

module.exports = { checkFraud };
