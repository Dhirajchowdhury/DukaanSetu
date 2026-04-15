const nodemailer = require('nodemailer');

// Only create transporter if email credentials are configured
let transporter = null;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

// Check if email credentials are valid (not placeholder values)
if (emailUser && emailPass && emailUser.includes('@') && emailPass.length > 5 && !emailUser.includes('your_email')) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
    console.log('✅ Email service initialized');
  } catch (error) {
    console.warn('⚠️  Email service initialization failed:', error.message);
  }
} else {
  console.warn('⚠️  Email credentials not configured. Email notifications disabled.');
}

/**
 * Send email verification OTP
 */
const sendVerificationEmail = async (email, otp) => {
  if (!transporter) {
    console.log('ℹ️  Email service not configured. Skipping email notification.');
    return;
  }

  try {
    const mailOptions = {
      from: `"StockSync" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - StockSync',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8AA624;">Welcome to StockSync!</h2>
          <p>Your verification code is:</p>
          <h1 style="background: #F7F4EA; padding: 20px; text-align: center; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
  }
};

/**
 * Send low stock alert email
 */
const sendLowStockAlert = async (email, products) => {
  if (!transporter) {
    console.log('ℹ️  Email service not configured. Skipping email notification.');
    return;
  }

  try {
    const productList = products.map(p => 
      `<li><strong>${p.productName}</strong> - ${p.quantity} ${p.unit} remaining</li>`
    ).join('');

    const mailOptions = {
      from: `"StockSync Alerts" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '⚠️ Low Stock Alert - StockSync',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FEA405;">⚠️ Low Stock Alert</h2>
          <p>The following products are running low:</p>
          <ul style="line-height: 1.8;">
            ${productList}
          </ul>
          <p>Please restock these items soon.</p>
          <a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; background: #8AA624; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Dashboard</a>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Low stock alert sent to ${email}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
  }
};

/**
 * Send expiring products alert email
 */
const sendExpiryAlert = async (email, products) => {
  if (!transporter) {
    console.log('ℹ️  Email service not configured. Skipping email notification.');
    return;
  }

  try {
    const productList = products.map(p => {
      const daysLeft = Math.ceil((new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      return `<li><strong>${p.productName}</strong> (Batch: ${p.batchNumber}) - Expires in ${daysLeft} days</li>`;
    }).join('');

    const mailOptions = {
      from: `"StockSync Alerts" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '📅 Products Expiring Soon - StockSync',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">📅 Products Expiring Soon</h2>
          <p>The following products will expire within 7 days:</p>
          <ul style="line-height: 1.8;">
            ${productList}
          </ul>
          <p>Consider offering discounts or promotions to clear these items.</p>
          <a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; background: #8AA624; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Dashboard</a>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Expiry alert sent to ${email}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
  }
};

module.exports = {
  sendVerificationEmail,
  sendLowStockAlert,
  sendExpiryAlert,
};
