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
import chatbotRoutes from "./Modules/Chatbot/chatbot.routes.js";
import { checkHealth as checkGeminiHealth } from "./Modules/Chatbot/chatbot.service.js";
import { conversationModel } from "./Database/Models/conversation.model.js";
import cookieParser from "cookie-parser";
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
import { dbConnection } from "./Database/dbConnection.js";
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

  const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:3000",
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
    }),
  );
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
          connectSrc: [
            "'self'",
            ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
          ],
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

  // Root route
  app.get("/", (req, res) => {
    res.status(200).json({
      status: "success",
      message: "Express E-Commerce API is running",
    });
  });

  app.get("/health", async (req, res) => {
    // Check MongoDB connection by running a lightweight command
    let mongoStatus = "disconnected";
    let dbState = mongoose.connection.readyState;

    // Try to reconnect if disconnected
    if (dbState === 0 || dbState === 3) {
      try {
        await dbConnection();
        dbState = mongoose.connection.readyState;
      } catch (err) {
        logger.error({ err }, "Health Check Reconnect Failed");
      }
    }

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

    // Check Gemini API connectivity
    let geminiHealth = { status: "disconnected", model: null, latencyMs: null };
    try {
      geminiHealth = await checkGeminiHealth();
    } catch {
      geminiHealth.status = "disconnected";
    }

    const allHealthy =
      mongoStatus === "connected" &&
      redisStatus === "connected" &&
      geminiHealth.status === "connected";

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus,
        mongodbState: dbState, // Debug info: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        redis: redisStatus,
        gemini: geminiHealth,
      },
    });
  });

  // Redirect trailing-slash variant (Express 5 treats them as distinct routes)
  //app.get("/api-docs/", (req, res) => res.redirect("/api-docs"));

  app.get("/api-docs", async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const swaggerDocument = await getSwaggerDocument(baseUrl);

      // Safely serialize the document
      let specJson = "{}";
      try {
        specJson = JSON.stringify(swaggerDocument);
      } catch (e) {
        console.error("Swagger serialization failed", e);
      }

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
                spec: ${specJson},
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
    } catch (err) {
      console.error("Swagger generation failed", err);
      res.status(500).send("API Docs Error");
    }
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
  conversationModel;

  app.use(userRoutes);
  app.use(categoryRoutes);
  app.use(productsRoutes);
  app.use(reviewRoutes);
  app.use(cartRoutes);
  app.use(orderRoutes);
  app.use("/admin", adminRouter);
  app.use(sellerRoutes);
  app.use(chatbotRoutes);

  app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });
  app.use(globalErrorHandler);

  return app;
};
