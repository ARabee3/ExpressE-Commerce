import express from "express";
import logger from "./Utils/logger.js";
import { globalErrorHandler } from "./Middlewares/globalErrorHandler.js";
import { productModel } from "./Database/Models/product.model.js";
import productsRoutes from "./Modules/Product/product.routes.js";
import { reviewModel } from "./Database/Models/review.model.js";
import reviewRoutes from "./Modules/Review/review.routes.js";
import { orderModel } from "./Database/Models/order.model.js";
import orderRoutes from "./Modules/Order/order.routes.js";
import { stripeWebhook } from "./Modules/Order/order.controller.js";
import { categoryModel } from "./Database/Models/category.model.js";
import categoryRoutes from "./Modules/Category/category.routes.js";
import userRoutes from "./Modules/User/user.routes.js";
import adminRouter from "./Modules/Admin/admin.routes.js";
import cookieParser from "cookie-parser";
import "./Utils/Events/sendEmailEvent.js";
import cors from "cors";
import { AppError } from "./Utils/Error/AppError.js";

import { cartModel } from "./Database/Models/cart.model.js";
import { couponModel } from "./Database/Models/coupon.model.js";
import cartRoutes from "./Modules/Cart/cart.routes.js";
import helmet from "helmet";
import { globalLimiter, initLimiters } from "./Middlewares/rateLimiter.js";
import sellerRoutes from "./Modules/Seller/seller.routes.js";
import { getSwaggerDocument } from "./docs/swaggerConfig.js";
import { enforceHttps } from "./Middlewares/enforceHttps.js";
import mongoose from "mongoose";
import { redisClient } from "./Database/redisConnection.js";
import { sanitizeNoSQL } from "./Middlewares/sanitizeNoSQL.js";

/**
 * Creates and configures the Express application.
 * Separated from app.js so supertest can import it without starting a server.
 */
export const createApp = () => {
  const app = express();

  // HTTPS enforcement (production only)
  app.use(enforceHttps);

  app.use(cors());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdnjs.cloudflare.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdnjs.cloudflare.com",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  // Stripe webhook needs raw body — must come before json parser
  app.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhook,
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(sanitizeNoSQL);

  app.use(cookieParser());

  app.set("trust proxy", 1);
  app.use(globalLimiter);

  app.get("/", (req, res) => {
    res.status(200).json({ status: "success", message: "Express E-Commerce API is running" });
  });

  app.get("/health", async (req, res) => {
    // Check MongoDB connection by running a lightweight command
    let mongoStatus = "disconnected";
    let dbState = mongoose.connection.readyState;
    try {
      if (dbState === 1) {
        // Run ping command on admin database to verify connectivity
        await mongoose.connection.db.admin().ping();
        mongoStatus = "connected";
      } else {
        // If not connected (state 1), try to reconnect explicitly if needed,
        // or just report status based on state
        mongoStatus = dbState === 2 ? "connecting" : "disconnected";
      }
    } catch (err) {
      mongoStatus = "disconnected";
      logger.error({ err }, "MongoDB Health Check Failed");
    }

    let redisStatus = "disconnected";
    try {
      if (redisClient.isOpen) {
        // Verify redis is responsive
        await redisClient.ping();
        redisStatus = "connected";
      } else {
        redisStatus = "disconnected";
      }
    } catch {
      redisStatus = "disconnected";
    }

    const allHealthy =
      mongoStatus === "connected" && redisStatus === "connected";

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus,
        mongodbState: dbState, // Debug info: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        redis: redisStatus,
      },
    });
  });

  // Redirect case-insensitive /api-docs requests to lowercase
  app.get("/API-DOCS", (req, res) => res.redirect("/api-docs"));

  // Manually serve Swagger UI to avoid Vercel static file serving issues
  app.use("/api-docs", async (req, res) => {
    const swaggerDocument = await getSwaggerDocument();
    
    // Fallback if document fails to load properly with a basic structure
    const safeDocument = swaggerDocument && typeof swaggerDocument === 'object' 
      ? swaggerDocument 
      : { openapi: '3.0.0', info: { title: 'Error', version: '1.0.0' }, paths: {} };

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Express E-Commerce API Docs</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui.min.css" />
        <style>
          html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
          *, *:before, *:after { box-sizing: inherit; }
          body { margin: 0; background: #fafafa; }
          .swagger-ui .topbar { display: none }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui-bundle.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui-standalone-preset.js"></script>
        <script>
          window.onload = function() {
            window.ui = SwaggerUIBundle({
              spec: ${JSON.stringify(safeDocument)},
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              layout: "StandaloneLayout"
            });
          };
        </script>
      </body>
      </html>
    `);
  });

  //serve images
  app.use("/uploads", express.static("uploads"));

  // Ensure all models are registered before routes
  orderModel;
  categoryModel;
  productModel;
  reviewModel;
  cartModel;
  couponModel;

  app.use(userRoutes);
  app.use(categoryRoutes);
  app.use(productsRoutes);
  app.use(reviewRoutes);
  app.use(cartRoutes);
  app.use(orderRoutes);
  app.use("/admin", adminRouter);
  app.use(sellerRoutes);

  app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });
  app.use(globalErrorHandler);

  return app;
};
