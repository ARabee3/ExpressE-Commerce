# 🛒 Express E-Commerce API

A full-featured RESTful E-Commerce API built with **Express.js**, **MongoDB**, and **Redis**.

## ✨ Features

- **Authentication** — JWT access/refresh tokens, email OTP verification, password reset
- **Role-Based Access** — Customer, Seller, Admin with middleware guards
- **Product Management** — CRUD, search, filtering, pagination, category support
- **Shopping Cart** — Guest & authenticated carts, coupon support, cart merge on login
- **Order System** — Place orders, track status, cancel with stock rollback
- **Payments** — Stripe integration with webhook verification
- **Reviews** — Star ratings with automatic product average calculation
- **Admin Panel** — Dashboard stats, user/order/coupon/seller management
- **Seller System** — Register as seller, admin approval, product management
- **Security** — Helmet, CORS, rate limiting (Redis-backed), input validation (Joi)
- **Structured Logging** — Pino with pretty-print in dev, JSON in production

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB (Mongoose) |
| Cache / Rate Limit | Redis (Upstash compatible) |
| Auth | JWT + bcrypt |
| Payments | Stripe |
| Email | Nodemailer (Gmail) |
| Validation | Joi |
| Logging | Pino |
| Docs | Swagger UI (OpenAPI 3.0) |

## 📋 Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (Atlas or local)
- **Redis** (Upstash, local, or Docker)
- **Stripe account** (for payments — optional)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ARabee3/ExpressE-Commerce.git
cd ExpressE-Commerce
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file in the project root:

```env
ENVIRONMENT=development
PORT=3000
BASE_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
SECRETKEY=<your-access-token-secret>
REFRESH_TOKEN_SECRET=<your-refresh-token-secret>

# Email (Gmail App Password)
EMAIL=your-email@gmail.com
GOOGLE_APP_PASSWORD=<your-google-app-password>

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Start the server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:3000`.

## 📖 API Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/api-docs
```

You can test all endpoints directly from the browser. Click **Authorize** 🔓 and paste your JWT token to test authenticated endpoints.

## 📁 Project Structure

```
├── app.js                     # Entry point
├── Database/
│   ├── Models/                # Mongoose models (7 models)
│   ├── dbConnection.js        # MongoDB connection
│   └── redisConnection.js     # Redis connection
├── Middlewares/
│   ├── globalErrorHandler.js  # Central error handler
│   ├── rateLimiter.js         # Redis-backed rate limiting
│   ├── validate.js            # Joi validation middleware
│   ├── verifyToken.js         # JWT authentication
│   ├── isAdmin.js             # Admin guard
│   ├── isAuthor.js            # Resource ownership check
│   └── isSellerAndActive.js   # Seller guard
├── Modules/
│   ├── User/                  # Auth, profile, addresses, wishlist
│   ├── Product/               # Product CRUD
│   ├── Category/              # Category CRUD
│   ├── Cart/                  # Cart with guest support
│   ├── Order/                 # Orders & Stripe payments
│   ├── Review/                # Product reviews
│   ├── Coupon/                # Coupon management
│   ├── Admin/                 # Admin dashboard & management
│   └── Seller/                # Seller registration & products
├── Validations/               # Joi schemas for each module
├── Utils/
│   ├── Error/                 # AppError class & catchAsync
│   ├── Email/                 # Email templates & sender
│   ├── Events/                # EventEmitter for async emails
│   ├── logger.js              # Pino logger configuration
│   └── hashPassword.js        # bcrypt pre-save hook
└── docs/
    ├── swagger.yaml           # OpenAPI 3.0 specification
    └── swaggerConfig.js       # Swagger UI loader
```

## 🔐 Authentication Flow

```
Register → Receive OTP email → Verify Email → Login → Get Access Token
                                                  ↓
                                        Use token in Authorization header
                                                  ↓
                                        Token expires (30min) → POST /refresh
```

## 🛒 Shopping Flow

```
Browse Products → Add to Cart → Apply Coupon (optional)
       ↓
Place Order → Pay (Card via Stripe / Cash)
       ↓
Track Order → Receive status emails
```

## 👥 Roles & Permissions

| Action | Customer | Seller | Admin |
|---|:---:|:---:|:---:|
| Browse products | ✅ | ✅ | ✅ |
| Manage cart & orders | ✅ | ✅ | ✅ |
| Write reviews | ✅ | ✅ | ✅ |
| Create products | ❌ | ✅ | ❌ |
| Manage categories | ❌ | ✅ | ❌ |
| Manage all orders | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Manage coupons | ❌ | ❌ | ✅ |
| Approve sellers | ❌ | ❌ | ✅ |

## 📜 Scripts

| Script | Command | Description |
|---|---|---|
| dev | `npm run dev` | Start with nodemon (auto-restart) |
| start | `npm start` | Start for production |
| test | `npm test` | Run tests (not yet configured) |

## 👨‍💻 Authors

ITI Open Source Track Intake 46:

Ahmed Rabie
Mostafa Ahmed
Sohayla Gomaa
Youssef Wael

## 📄 License

ISC
