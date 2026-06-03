const twilio = require('twilio');

// Only initialize Twilio if valid credentials are provided
let client = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Check if Twilio credentials are valid (not placeholder values)
if (accountSid && authToken && accountSid.startsWith('AC') && authToken.length > 10) {
  try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS service initialized');
  } catch (error) {
    console.warn('⚠️  Twilio initialization failed:', error.message);
  }
} else {
  console.warn('⚠️  Twilio credentials not configured. SMS notifications disabled.');
}

/**
 * Send low stock alert SMS
 */
const sendLowStockSMS = async (phoneNumber, productName, quantity) => {
  if (!client) {
    console.log('ℹ️  SMS service not configured. Skipping SMS notification.');
    return;
  }

  try {
    await client.messages.create({
      body: `StockSync Alert: ${productName} is low on stock (${quantity} remaining). Restock soon!`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log(`✅ SMS sent to ${phoneNumber}`);
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
  }
};

/**
 * Send expiry alert SMS
 */
const sendExpirySMS = async (phoneNumber, productName, daysLeft) => {
  if (!client) {
    console.log('ℹ️  SMS service not configured. Skipping SMS notification.');
    return;
  }

  try {
    await client.messages.create({
      body: `StockSync Alert: ${productName} expires in ${daysLeft} days. Take action!`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log(`✅ SMS sent to ${phoneNumber}`);
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
  }
};

const sendOrderSMS = async (phoneNumber, orderId, message) => {
  if (!client) {
    console.log('ℹ️  SMS service not configured. Skipping SMS notification.');
    return;
  }
  try {
    await client.messages.create({
      body: `DukaanSetu: ${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log(`✅ Order SMS sent to ${phoneNumber}`);
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
  }
};

const sendWhatsApp = async (to, message) => {
  if (!client) {
    console.log('ℹ️  SMS service not configured. Skipping WhatsApp notification.');
    return;
  }
  try {
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    const whatsappTo = `whatsapp:${to.replace(/^\+/, '')}`;
    await client.messages.create({
      body: `DukaanSetu: ${message}`,
      from: whatsappFrom,
      to: whatsappTo,
    });
    console.log(`✅ WhatsApp sent to ${to}`);
  } catch (error) {
    console.error('❌ WhatsApp sending failed:', error.message);
  }
};

module.exports = {
  sendLowStockSMS,
  sendExpirySMS,
  sendOrderSMS,
  sendWhatsApp,
};
