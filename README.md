# 📦 DukaanSetu — Smart Inventory Management System

> A production-ready MERN stack inventory management platform built for Indian small businesses, distributors, wholesalers, and producers.

---

## 🌟 Project Overview

DukaanSetu ("Dukaan" = Shop, "Setu" = Bridge) is a full-stack SaaS-style inventory management system that helps businesses track stock levels, monitor expiry dates, receive low-stock alerts, and manage products across multiple categories — all from a clean, modern dashboard.

---

## ✅ Features Implemented (Week 1 — Foundation & Core)

### 🔐 Authentication
- Multi-role registration: **Shop Owner**, **Distributor**, **Wholesaler**, **Producer**
- JWT-based auth with **Access Token + Refresh Token** (httpOnly cookie)
- Email verification via **OTP** (6-digit code)
- Google OAuth 2.0 social login
- Password hashing with **bcrypt** (12 rounds)
- Role-based access control (RBAC)
- Profile update & password change APIs
- Protected routes (frontend + backend)

### 📦 Inventory Core
- Full **CRUD** for products (Add / Edit / Delete / View)
- Fields: name, brand, category, quantity, unit, cost price, selling price, expiry date, batch number, supplier
- **Manual stock correction** API (`PATCH /api/products/:id/stock`)
- **Low stock alerts** (threshold-based, configurable per user)
- **Out-of-stock** detection
- **Expiry date tracking** (7-day warning)
- Search, filter by category, filter by stock level
- Sortable columns (name, quantity, price, expiry)
- Inventory value calculation

### 🗂️ Categories
- Default system categories (seeded)
- Custom category creation with emoji icon picker
- Edit / delete custom categories
- Product count validation before deletion

### 📊 Dashboard & Reports
- Stats cards: Total Products, Low Stock, Expiring Soon, Inventory Value
- Recent products table on dashboard
- Reports page: category breakdown bar chart, low stock list, out-of-stock list, expiring soon list

### ⚙️ Settings
- Profile management (shop name, phone)
- Password change
- Notification preferences (email, SMS toggles)
- Low stock threshold configuration

### 🎨 UI/UX
- Modern SaaS dashboard design
- Dark sidebar navigation with role badge
- Responsive layout (mobile-friendly)
- Product add/edit modal with validation
- Toast notifications (success, error)
- Loading states & empty states
- Smooth transitions & hover effects

---

## 🛠️ Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18 (Vite), React Router v6, Axios         |
| Styling    | Pure CSS with CSS custom properties (no Tailwind) |
| Backend    | Node.js, Express.js                             |
| Database   | Supabase (PostgreSQL)                           |
| Auth       | JWT (jsonwebtoken), bcrypt, Passport.js (Google OAuth) |
| Email      | Nodemailer                                      |
| SMS        | Twilio                                          |
| Scheduling | node-cron (daily alert scheduler)               |
| Security   | Helmet, CORS, express-rate-limit                |

---

## 📁 Folder Structure

```
dukaansetu/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── auth/           # PrivateRoute
│       │   ├── dashboard/      # StatsCards, ProductTable
│       │   ├── layout/         # Sidebar, Navbar, Footer
│       │   └── products/       # ProductModal
│       ├── context/            # AuthContext, ProductContext
│       ├── pages/              # Dashboard, Products, Categories, Reports, Settings, Login, Signup
│       ├── services/           # api.js (axios instance)
│       └── index.css           # Global design system
│
└── server/                     # Express backend
    ├── config/                 # db.js, passport.js
    ├── controllers/            # auth, product, category, barcode, notification
    ├── cron/                   # alertScheduler.js
    ├── middleware/             # auth, errorHandler, validation
    ├── models/                 # User, Product, Category, ScanHistory
    ├── routes/                 # auth, product, category, barcode, notification
    ├── services/               # email, sms, barcode
    └── utils/                  # generateToken, seedCategories
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone & Install

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment Variables

**`server/.env`**
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Optional
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

**`client/.env`**
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Seed Default Categories

```bash
cd server
node utils/seedCategories.js
```

### 4. Run the App

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

App runs at: **http://localhost:5173**
API runs at: **http://localhost:5000**

---

## 📡 API Endpoints

### Auth
| Method | Endpoint                  | Description              | Auth |
|--------|---------------------------|--------------------------|------|
| POST   | `/api/auth/signup`        | Register new user        | ❌   |
| POST   | `/api/auth/verify-email`  | Verify OTP               | ❌   |
| POST   | `/api/auth/login`         | Login                    | ❌   |
| POST   | `/api/auth/refresh`       | Refresh access token     | ❌   |
| POST   | `/api/auth/logout`        | Logout                   | ✅   |
| GET    | `/api/auth/me`            | Get current user         | ✅   |
| PUT    | `/api/auth/profile`       | Update profile           | ✅   |
| PUT    | `/api/auth/change-password` | Change password        | ✅   |
| GET    | `/api/auth/google`        | Google OAuth             | ❌   |

### Products
| Method | Endpoint                      | Description              | Auth |
|--------|-------------------------------|--------------------------|------|
| GET    | `/api/products`               | Get all products (filter/search/sort) | ✅ |
| POST   | `/api/products`               | Create product           | ✅   |
| GET    | `/api/products/stats`         | Dashboard stats          | ✅   |
| GET    | `/api/products/:id`           | Get single product       | ✅   |
| PUT    | `/api/products/:id`           | Update product           | ✅   |
| DELETE | `/api/products/:id`           | Delete product           | ✅   |
| PATCH  | `/api/products/:id/stock`     | Manual stock correction  | ✅   |

### Categories
| Method | Endpoint                  | Description              | Auth |
|--------|---------------------------|--------------------------|------|
| GET    | `/api/categories`         | Get all categories       | ✅   |
| POST   | `/api/categories`         | Create category          | ✅   |
| PUT    | `/api/categories/:id`     | Update category          | ✅   |
| DELETE | `/api/categories/:id`     | Delete category          | ✅   |

### Notifications
| Method | Endpoint                      | Description              | Auth |
|--------|-------------------------------|--------------------------|------|
| GET    | `/api/notifications`          | Get notifications        | ✅   |
| POST   | `/api/notifications/send-alerts` | Trigger alerts manually | ✅  |

---

## 🎨 Color System

| Token       | Value     | Usage                    |
|-------------|-----------|--------------------------|
| Primary     | `#2563EB` | Buttons, links, active states |
| Secondary   | `#1E293B` | Sidebar background       |
| Accent      | `#22C55E` | Success, in-stock        |
| Danger      | `#EF4444` | Errors, out-of-stock     |
| Warning     | `#F59E0B` | Low stock alerts         |
| Background  | `#F8FAFC` | Page background          |
| Text        | `#0F172A` | Primary text             |

---

## 📸 Screenshots

> _Add screenshots here after running the app_

| Page | Screenshot |
|------|-----------|
| Login | `[screenshot]` |
| Dashboard | `[screenshot]` |
| Products | `[screenshot]` |
| Categories | `[screenshot]` |
| Reports | `[screenshot]` |
| Settings | `[screenshot]` |

---

## 🔮 Future Scope (Week 2+)

- [ ] Barcode scanner (camera integration)
- [ ] Bulk CSV import/export
- [ ] Sales tracking & profit reports
- [ ] Supplier management
- [ ] Invoice generation (PDF)
- [ ] Push notifications (Firebase)
- [ ] Dark mode
- [ ] PWA (offline support)
- [ ] Multi-location inventory
- [ ] Audit logs / stock movement history
- [ ] Swagger API documentation

---

## 👨‍💻 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## 📄 License

MIT
