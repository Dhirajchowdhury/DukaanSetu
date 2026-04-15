# 🔐 Complete Environment Setup Guide

This guide will help you configure all environment variables needed for StockSync to function fully.

---

## 📁 Environment Files

You need to configure TWO `.env` files:

1. **`server/.env`** - Backend configuration
2. **`client/.env`** - Frontend configuration

---

## 🖥️ Server Environment Variables (`server/.env`)

### ✅ Required (Core Functionality)

#### 1. MongoDB Database
```env
MONGO_URI=mongodb://localhost:27017/stocksync
```

**Options:**

**A. Local MongoDB (Easiest for Development)**
```env
MONGO_URI=mongodb://localhost:27017/stocksync
```
- Install MongoDB: https://www.mongodb.com/try/download/community
- No additional setup needed

**B. MongoDB Atlas (Cloud - Recommended for Production)**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/stocksync?retryWrites=true&w=majority
```

**How to get MongoDB Atlas URI:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a new cluster (free tier available)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<username>` and `<password>` with your credentials
7. Replace `<cluster>` with your cluster name

---

#### 2. JWT Secrets (Authentication)
```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_different_from_jwt_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

**How to generate secure secrets:**

**Option A: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option B: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option C: Online Generator**
- Visit: https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" (256-bit)

**Important:**
- Use DIFFERENT secrets for JWT_SECRET and JWT_REFRESH_SECRET
- Minimum 32 characters
- Never share these secrets
- Change them in production

---

#### 3. Server Configuration
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

**For Production:**
```env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
```

---

### 🔔 Optional (Enhanced Features)

#### 4. Google OAuth (Social Login)

```env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

**How to get Google OAuth credentials:**

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen:
   - User Type: External
   - App name: StockSync
   - User support email: your email
   - Developer contact: your email
6. Create OAuth Client ID:
   - Application type: Web application
   - Name: StockSync Web Client
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
7. Copy Client ID and Client Secret

**For Production:**
- Add your production domain to authorized origins
- Update callback URL: `https://yourdomain.com/api/auth/google/callback`

---

#### 5. Email Notifications (Nodemailer)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
```

**How to setup Gmail for sending emails:**

1. **Enable 2-Factor Authentication:**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Enter "StockSync"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)
   - Use this as `EMAIL_PASS`

**Alternative Email Providers:**

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your_sendgrid_api_key
```
- Sign up: https://sendgrid.com/
- Free tier: 100 emails/day

**Mailgun:**
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASS=your_mailgun_password
```
- Sign up: https://www.mailgun.com/
- Free tier: 5,000 emails/month

---

#### 6. SMS Notifications (Twilio)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**How to get Twilio credentials:**

1. Sign up at https://www.twilio.com/try-twilio
2. Verify your email and phone number
3. Go to Console Dashboard
4. Copy "Account SID" and "Auth Token"
5. Get a phone number:
   - Go to "Phone Numbers" → "Manage" → "Buy a number"
   - Free trial includes $15 credit
   - Choose a number with SMS capability
6. Copy the phone number (format: +1234567890)

**Important:**
- Trial accounts can only send to verified numbers
- Upgrade for production use
- Free trial credit: $15 (enough for testing)

**Alternative SMS Providers:**

**Vonage (Nexmo):**
- Sign up: https://www.vonage.com/communications-apis/
- Free trial: $2 credit

**AWS SNS:**
- Sign up: https://aws.amazon.com/sns/
- Pay as you go pricing

---

#### 7. Barcode Lookup API (Product Information)

```env
BARCODE_API_KEY=your_barcode_lookup_api_key
BARCODE_API_URL=https://api.barcodelookup.com/v3/products
```

**How to get Barcode API key:**

**Option A: Barcode Lookup (Recommended)**
1. Sign up at https://www.barcodelookup.com/
2. Go to "API" section
3. Copy your API key
4. Free tier: 100 requests/day

**Option B: UPC Database**
1. Sign up at https://www.upcitemdb.com/
2. Free tier: 100 requests/day
3. Update URL: `https://api.upcitemdb.com/prod/trial/lookup`

**Option C: Open Food Facts (Free, Food Products Only)**
```env
BARCODE_API_URL=https://world.openfoodfacts.org/api/v0/product
```
- No API key needed
- Free and open source
- Food products only

---

#### 8. Push Notifications (Firebase Cloud Messaging)

```env
FCM_SERVER_KEY=your_firebase_server_key
FCM_SENDER_ID=your_firebase_sender_id
```

**How to setup Firebase:**

1. Go to https://console.firebase.google.com/
2. Create a new project
3. Add a web app to your project
4. Go to Project Settings → Cloud Messaging
5. Copy "Server key" and "Sender ID"
6. Enable Cloud Messaging API:
   - Go to Google Cloud Console
   - Enable "Firebase Cloud Messaging API"

**Note:** Push notifications require HTTPS in production

---

## 🌐 Client Environment Variables (`client/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### Configuration:

#### 1. API URL
```env
VITE_API_URL=http://localhost:5000
```

**For Production:**
```env
VITE_API_URL=https://your-backend-domain.com
```

#### 2. Google Client ID
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```
- Use the SAME Client ID from Google OAuth setup above
- Only the Client ID, NOT the secret

---

## 📋 Complete Example Files

### `server/.env` (Full Example)

```env
# ============================================
# REQUIRED - Core Functionality
# ============================================

# MongoDB
MONGO_URI=mongodb://localhost:27017/stocksync

# JWT Authentication
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_REFRESH_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# ============================================
# OPTIONAL - Enhanced Features
# ============================================

# Google OAuth (Optional - for social login)
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Email Notifications (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop

# SMS Notifications (Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Barcode Lookup API (Optional)
BARCODE_API_KEY=your_barcode_api_key
BARCODE_API_URL=https://api.barcodelookup.com/v3/products

# Push Notifications (Optional)
FCM_SERVER_KEY=your_fcm_server_key
FCM_SENDER_ID=123456789012
```

### `client/.env` (Full Example)

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

---

## 🚀 Quick Start Checklist

### Minimum Setup (Basic Functionality):
- [ ] MongoDB URI configured
- [ ] JWT secrets generated (2 different secrets)
- [ ] Server PORT and CLIENT_URL set
- [ ] Client VITE_API_URL set

### Full Setup (All Features):
- [ ] Google OAuth configured
- [ ] Email service configured
- [ ] SMS service configured
- [ ] Barcode API configured
- [ ] Firebase push notifications configured

---

## 🔒 Security Best Practices

### Development:
✅ Use `.env` files (already in `.gitignore`)
✅ Use placeholder values for testing
✅ Local MongoDB is fine

### Production:
✅ Use environment variables from hosting platform
✅ Never commit `.env` files to Git
✅ Use strong, unique secrets (32+ characters)
✅ Use MongoDB Atlas (cloud database)
✅ Enable HTTPS
✅ Rotate secrets regularly
✅ Use different secrets for dev/staging/production

---

## 🧪 Testing Your Configuration

### 1. Test Backend:
```bash
cd server
npm run dev
```

**Expected output:**
```
✅ Email service initialized (or warning if not configured)
✅ Twilio SMS service initialized (or warning if not configured)
🚀 Server running on port 5000
✅ MongoDB Connected
```

### 2. Test Frontend:
```bash
cd client
npm run dev
```

**Expected output:**
```
VITE ready in XXX ms
Local: http://localhost:5173
```

### 3. Test API Connection:
Visit: http://localhost:5000/health

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ"
}
```

---

## 🆘 Troubleshooting

### MongoDB Connection Failed
**Error:** `MongoNetworkError: connect ECONNREFUSED`

**Solutions:**
- Ensure MongoDB is running: `mongod` (local)
- Check MongoDB Atlas IP whitelist (cloud)
- Verify connection string format

### Email Not Sending
**Error:** `Invalid login` or `Authentication failed`

**Solutions:**
- Enable 2FA on Gmail
- Generate App Password (not regular password)
- Check EMAIL_HOST and EMAIL_PORT

### SMS Not Sending
**Error:** `accountSid must start with AC`

**Solutions:**
- Verify Account SID starts with "AC"
- Check Auth Token is correct
- Verify phone number format: +1234567890

### Google OAuth Not Working
**Error:** `redirect_uri_mismatch`

**Solutions:**
- Add callback URL to Google Console
- Match exactly: `http://localhost:5000/api/auth/google/callback`
- Check Client ID is correct

---

## 📞 Support & Resources

### Official Documentation:
- MongoDB: https://docs.mongodb.com/
- Twilio: https://www.twilio.com/docs
- Nodemailer: https://nodemailer.com/
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- Firebase: https://firebase.google.com/docs

### Free Tier Limits:
- MongoDB Atlas: 512 MB storage
- Twilio: $15 trial credit
- SendGrid: 100 emails/day
- Barcode Lookup: 100 requests/day
- Firebase: 10K notifications/month

---

## 🎉 You're All Set!

Once you've configured the required variables, your StockSync app will be fully functional!

**Required for basic use:** MongoDB + JWT secrets
**Optional for full features:** Google OAuth, Email, SMS, Barcode API, Push notifications

Start with the basics and add optional services as needed! 🚀
