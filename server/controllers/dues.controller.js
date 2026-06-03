const { supabase } = require('../config/db');

const getPendingDues = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();

    const { data: duesAsSeller, error: err1 } = await supabase
      .from('orders')
      .select(`
        id, total_price, created_at, delivery_location, notes,
        buyer:users!buyer_id(id, shop_name, email, phone_number),
        wholesaler_products:wholesaler_products!product_id(product_name)
      `)
      .eq('seller_id', userId)
      .eq('status', 'delivered')
      .or('payment_status.is.null,payment_status.neq.paid');

    if (err1) throw err1;

    const dues = (duesAsSeller || []).map(order => {
      const deliveryDate = new Date(order.created_at);
      const daysOverdue = Math.floor((Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: order.id,
        buyer: order.buyer ? { id: order.buyer.id, shopName: order.buyer.shop_name, email: order.buyer.email, phoneNumber: order.buyer.phone_number } : null,
        totalPrice: order.total_price,
        deliveryDate: order.created_at,
        daysOverdue,
        productName: order.wholesaler_products?.product_name || 'Multiple items',
      };
    });

    const totalPending = dues.reduce((sum, d) => sum + parseFloat(d.totalPrice || 0), 0);

    res.json({
      dues,
      summary: {
        totalPending,
        orderCount: dues.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const sendDueReminder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { sendEmail, sendSms } = req.body;

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select(`
        id, total_price, created_at,
        buyer:users!buyer_id(id, shop_name, email, phone_number),
        seller:users!seller_id(id, shop_name)
      `)
      .eq('id', orderId)
      .single();

    if (oErr || !order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.seller.id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!order.buyer) {
      return res.status(400).json({ message: 'Buyer info not found' });
    }

    const results = { emailSent: false, smsSent: false };

    if (sendEmail && order.buyer.email) {
      try {
        const { sendOrderNotification } = require('../services/email.service');
        await sendOrderNotification(
          order.buyer.email,
          order.id,
          `Payment reminder: ₹${order.total_price} due for order #${order.id.slice(0, 8)}`
        );
        results.emailSent = true;
      } catch (err) {
        console.error('Failed to send reminder email:', err.message);
      }
    }

    if (sendSms && order.buyer.phoneNumber) {
      try {
        const { sendOrderSMS } = require('../services/sms.service');
        await sendOrderSMS(
          order.buyer.phoneNumber,
          order.id,
          `Payment reminder: ₹${order.total_price} due for order #${order.id.slice(0, 8)}`
        );
        results.smsSent = true;
      } catch (err) {
        console.error('Failed to send reminder SMS:', err.message);
      }
    }

    res.json({ message: 'Reminder sent', results });
  } catch (error) {
    next(error);
  }
};

const sendBuyerNudge = async (req, res, next) => {
  try {
    const { buyerId } = req.body;
    if (!buyerId) return res.status(400).json({ message: 'buyerId required' });

    const { data: buyer } = await supabase
      .from('users')
      .select('id, shop_name, email, phone_number')
      .eq('id', buyerId)
      .single();

    if (!buyer) return res.status(404).json({ message: 'Buyer not found' });

    const { sendOrderNotification } = require('../services/email.service');
    const { sendOrderSMS } = require('../services/sms.service');

    if (buyer.email) {
      await sendOrderNotification(buyer.email, 'nudge', `Hi ${buyer.shop_name}, we miss you! Visit DukaanSetu to discover new products and place your next order.`);
    }
    if (buyer.phone_number) {
      await sendOrderSMS(buyer.phone_number, 'nudge', `Hi ${buyer.shop_name}, we miss you! Check out new products on DukaanSetu.`);
    }

    res.json({ message: 'Nudge sent' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPendingDues, sendDueReminder, sendBuyerNudge };
