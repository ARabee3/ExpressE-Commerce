# 🛒 Express E-Commerce API

A full-featured RESTful E-Commerce API built with **Express.js**, **MongoDB**, and **Redis**.

## ✨ Features

- **Authentication** — JWT access/refresh tokens, email OTP verification, password reset
- **Role-Based Access** — Customer, Seller, Admin with middleware guards
- **Product Management** — CRUD, search, filtering, pagination, category support
- **Shopping Cart** — Guest & authenticated carts, coupon support, cart merge on login
- **Order System** — Place orders, track status, cancel with atomic stock rollback
- **Payments** — Stripe integration with webhook verification
- **Reviews** — Star ratings with automatic product average calculation
- **Admin Panel** — Dashboard stats, user/order/coupon/seller management
- **Seller System** — Register as seller, admin approval, product management
- **Security** — Helmet, CORS, rate limiting (Redis-backed), input validation (Joi), NoSQL injection protection, HTTPS enforcement
- **Structured Logging** — Pino with pretty-print in dev, JSON in production
- **Health Check** — `GET /health` with MongoDB + Redis status monitoring
- **Testing** — 36 integration tests with Vitest + Supertest

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
| Security | Helmet, CORS, Custom NoSQL Injection Protection |
| Logging | Pino |
| Testing | Vitest + Supertest |
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
├── app.js                     # Entry point (connects DB/Redis, starts server)
├── createApp.js               # Express app factory (testable)
├── vercel.json                # Vercel deployment config
├── .env.example               # Environment variable template
├── api/
│   └── index.js               # Vercel serverless adapter
├── Database/
│   ├── Models/                # Mongoose models (7 models)
│   ├── dbConnection.js        # MongoDB connection
│   └── redisConnection.js     # Redis connection
├── Middlewares/
│   ├── globalErrorHandler.js  # Central error handler
│   ├── rateLimiter.js         # Redis-backed rate limiting
│   ├── enforceHttps.js        # HTTPS redirect (production)
│   ├── sanitizeNoSQL.js       # NoSQL injection protection
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
├── tests/
│   ├── setup.js               # DB/Redis connect + teardown
│   ├── helpers.js             # Test factories & supertest instance
│   ├── health.test.js         # Health check tests
│   ├── auth.test.js           # Auth flow tests (13)
│   ├── product.test.js        # Product CRUD tests (8)
│   ├── cart.test.js           # Cart operation tests (7)
│   └── order.test.js          # Order lifecycle tests (7)
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
| test | `npm test` | Run all 36 tests |
| test:watch | `npm run test:watch` | Run tests in watch mode |

## 🧪 Testing

The project includes **36 integration tests** across 5 test suites:

```bash
npm test
```

| Suite | Tests | Covers |
|---|:---:|---|
| `health.test.js` | 1 | Health check endpoint |
| `auth.test.js` | 13 | Register, login, OTP verify, profile, password |
| `product.test.js` | 8 | Create, list, filter, update, delete |
| `cart.test.js` | 7 | Add, get, update, remove, guest, stock |
| `order.test.js` | 7 | Place, list, get, track, cancel, stock rollback |

Tests use a separate `_test` database that is automatically dropped after the suite completes.

## 🚀 Deployment (Vercel)

The API is deployed on [Vercel](https://vercel.com) — free tier, no credit card required.

A serverless adapter (`api/index.js`) wraps the Express app for Vercel's serverless runtime. The original `app.js` entry point is **not modified** — local development works exactly the same.

### Quick Deploy

1. Push the repo to GitHub
2. Sign up at [vercel.com](https://vercel.com) with GitHub (no credit card needed)
3. Click **Add New** → **Project** → import `ARabee3/ExpressE-Commerce`
4. Set **Root Directory** to `./` and **Framework Preset** to `Other`
5. Add environment variables (see [`.env.example`](.env.example)):

   | Variable | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `MONGODB_URI` | Your MongoDB Atlas connection string |
   | `REDIS_URL` | Your Upstash Redis URL (`rediss://...`) |
   | `SECRETKEY` | Your JWT access token secret |
   | `REFRESH_TOKEN_SECRET` | Your JWT refresh token secret |
   | `EMAIL` | Your Gmail address |
   | `GOOGLE_APP_PASSWORD` | Your Gmail app password |
   | `BASE_URL` | Your Vercel URL (set after first deploy) |

6. Click **Deploy**
7. Verify at `https://<your-app>.vercel.app/health`

> **Note:** After the first deploy, copy your Vercel URL and set it as the `BASE_URL` environment variable.

### What's pre-configured

- ✅ HTTPS (automatic on Vercel)
- ✅ Health check endpoint at `/health` (MongoDB + Redis status)
- ✅ Redis-backed rate limiting (graceful fallback if unavailable)
- ✅ Helmet security headers
- ✅ Swagger API docs at `/api-docs`

## 👨‍💻 Authors

ITI Open Source Track Intake 46:

Ahmed Rabie
Mostafa Ahmed
Sohayla Gomaa
Youssef Wael

## 📄 License

ISC
