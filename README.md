# 🛒 Express E-Commerce API

A full-featured RESTful E-Commerce API built with **Express.js**, **MongoDB**, and **Redis**, powering the [ExpressoCart](https://expresso-cart.vercel.app) storefront.

**Frontend:** https://expresso-cart.vercel.app  
**API Docs:** `/api-docs` (Swagger UI)

## ✨ Features

- **Authentication** — JWT access/refresh tokens, **Google OAuth**, email OTP verification, password reset
- **Role-Based Access** — Customer, Seller, Admin with middleware guards
- **Product Management** — CRUD, search, filtering, pagination, category support
- **Shopping Cart** — Guest & authenticated carts, coupon support, cart merge on login
- **Order System** — Place orders, track status, cancel with atomic stock rollback
- **Payments** — Stripe integration with webhook verification
- **Reviews** — Star ratings with automatic product average calculation
- **Admin Panel** — Dashboard stats, user/order/coupon/seller management
- **Seller System** — Register as seller, admin approval, product management
- **AI Chatbot** — Intelligent assistant for product search and order tracking using Gemini API
- **Security** — Helmet, CORS, rate limiting (Redis-backed), input validation (Joi), NoSQL injection protection, HTTPS enforcement
- **Structured Logging** — Pino with pretty-print in dev, JSON in production
- **Health Check** — `GET /health` with MongoDB + Redis status monitoring
- **Testing** — 36 integration tests with Vitest + Supertest

## 🏗️ Tech Stack

| Layer              | Technology                                                                             |
| ------------------ | -------------------------------------------------------------------------------------- |
| Runtime            | Node.js (ES Modules)                                                                   |
| Framework          | Express 5                                                                              |
| Database           | MongoDB (Mongoose)                                                                     |
| Cache / Rate Limit | Redis (Upstash compatible)                                                             |
| Auth               | JWT + bcrypt + Google OAuth                                                            |
| Payments           | Stripe                                                                                 |
| Email              | Nodemailer (Gmail)                                                                     |
| Validation         | Joi                                                                                    |
| AI / Chatbot       | Google Gemini (`gemini-2.5-flash`) via function calling                                |
| File Storage       | Cloudinary                                                                             |
| Security           | Helmet, CORS (`withCredentials` + origin allowlist), Custom NoSQL Injection Protection |
| Logging            | Pino                                                                                   |
| Testing            | Vitest + Supertest                                                                     |
| Docs               | Swagger UI (OpenAPI 3.0)                                                               |

## 📋 Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (Atlas or local)
- **Redis** (Upstash, local, or Docker)
- **Stripe account** (for payments — optional)
- **Google Cloud OAuth Client ID** (for Google login — optional)
- **Google Gemini API Key** (for the AI chatbot — optional, get one at [aistudio.google.com](https://aistudio.google.com))

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

# Frontend URL — used for CORS origin allowlist
CLIENT_URL=https://expresso-cart.vercel.app

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

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary (product image uploads)
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# Gemini API (Chatbot)
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-flash
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
│   ├── Seller/                # Seller registration & products
│   └── Chatbot/               # AI shopping assistant
├── Validations/               # Joi schemas for each module
├── Utils/
│   ├── Error/                 # AppError class & catchAsync
│   ├── Email/                 # Email templates & sender
│   ├── Events/                # EventEmitter for async emails
│   ├── cron/                  # Scheduled jobs (e.g. stale order cancellation)
│   ├── cloudinary.js          # Cloudinary upload helper
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
Email/Password:
  Register → Receive OTP email → Verify Email → Login
                                                  ↓
                              Access Token (body) + Refresh Token (httpOnly cookie)
                                                  ↓
                              Use access token in Authorization: Bearer <token>
                                                  ↓
                              Token expires (30min) → POST /refresh (withCredentials)
                                                  ↓
                              New access token returned

Google OAuth:
  Google Sign-In on frontend → POST /google-login { idToken }
                                                  ↓
                              Access Token (body) + Refresh Token (httpOnly cookie)
```

> The refresh token is stored in an `httpOnly`, `secure`, `sameSite=None` cookie so it works across the cross-origin frontend (`expresso-cart.vercel.app`) ↔ backend boundary. The frontend must send requests with `withCredentials: true`.

## 🤖 AI Chatbot

The chatbot is powered by **Google Gemini** (`gemini-2.5-flash`) with **function calling** — it queries the live database on the user's behalf instead of hallucinating data.

### Endpoints

| Method   | Path                         | Description                            |
| -------- | ---------------------------- | -------------------------------------- |
| `POST`   | `/chatbot/chat`              | Send a message, get a full response    |
| `POST`   | `/chatbot/chat/stream`       | Send a message, stream response as SSE |
| `GET`    | `/chatbot/conversations`     | List user's conversation history       |
| `GET`    | `/chatbot/conversations/:id` | Retrieve a specific conversation       |
| `DELETE` | `/chatbot/conversations/:id` | Delete a conversation                  |

All chatbot routes require authentication (`Authorization: Bearer <token>`).

### Function-Calling Tools

The model has access to these live-database tools:

| Tool                  | Description                              |
| --------------------- | ---------------------------------------- |
| `search_products`     | Search by keyword, category, price range |
| `get_product_details` | Full details for a product by ID         |
| `get_categories`      | List all product categories              |
| `get_product_reviews` | Reviews for a specific product           |
| `get_my_orders`       | The authenticated user's order list      |
| `track_order`         | Status + details of a specific order     |
| `get_cart`            | The authenticated user's current cart    |

### Conversation Management

- Conversations are persisted to MongoDB per user.
- A **sliding context window** of 20 messages is sent to Gemini on every turn.
- Up to **50 conversations** per user; stale ones (90 days inactive) are auto-archived.
- The model iterates through up to **5 tool call rounds** per message before responding.

### Safety & Rate Limiting

- Gemini safety filters are applied at `BLOCK_MEDIUM_AND_ABOVE` for harassment, hate speech, sexual content, and dangerous content.
- The chatbot endpoint has its own **dedicated rate limiter** (stricter than the global one).
- AI responses are HTML-sanitized before being returned to the client.

## 🛒 Shopping Flow

```
Browse Products → Add to Cart → Apply Coupon (optional)
       ↓
Place Order → Pay (Card via Stripe / Cash)
       ↓
Track Order → Receive status emails
```

## 👥 Roles & Permissions

| Action               | Customer | Seller | Admin |
| -------------------- | :------: | :----: | :---: |
| Browse products      |    ✅    |   ✅   |  ✅   |
| Manage cart & orders |    ✅    |   ✅   |  ✅   |
| Write reviews        |    ✅    |   ✅   |  ✅   |
| Create products      |    ❌    |   ✅   |  ❌   |
| Manage categories    |    ❌    |   ❌   |  ✅   |
| Manage all orders    |    ❌    |   ❌   |  ✅   |
| Manage users         |    ❌    |   ❌   |  ✅   |
| Manage coupons       |    ❌    |   ❌   |  ✅   |
| Approve sellers      |    ❌    |   ❌   |  ✅   |

## 📜 Scripts

| Script     | Command              | Description                       |
| ---------- | -------------------- | --------------------------------- |
| dev        | `npm run dev`        | Start with nodemon (auto-restart) |
| start      | `npm start`          | Start for production              |
| test       | `npm test`           | Run all 36 tests                  |
| test:watch | `npm run test:watch` | Run tests in watch mode           |

## 🧪 Testing

The project includes **36 integration tests** across 5 test suites:

```bash
npm test
```

| Suite             | Tests | Covers                                          |
| ----------------- | :---: | ----------------------------------------------- |
| `health.test.js`  |   1   | Health check endpoint                           |
| `auth.test.js`    |  13   | Register, login, OTP verify, profile, password  |
| `product.test.js` |   8   | Create, list, filter, update, delete            |
| `cart.test.js`    |   7   | Add, get, update, remove, guest, stock          |
| `order.test.js`   |   7   | Place, list, get, track, cancel, stock rollback |

Tests use a separate `_test` database that is automatically dropped after the suite completes.

## 👨‍💻 Authors

ITI Open Source Track Intake 46:

Ahmed Rabie
Mostafa Ahmed
Sohayla Gomaa
Youssef Wael

## 📄 License

ISC
