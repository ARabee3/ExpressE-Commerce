import express from "express";
import logger from "./Utils/logger.js";
import "dotenv/config";
import { dbConnection } from "./Database/dbConnection.js";
import { redisConnection } from "./Database/redisConnection.js";
import { globalErrorHandler } from "./Middlewares/globalErrorHandler.js";
import { productModel } from "./Database/Models/product.model.js";
import productsRoutes from "./Modules/Product/product.routes.js";
import { reviewModel } from "./Database/Models/review.model.js";
import reviewRoutes from "./Modules/Review/review.routes.js"
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
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./docs/swaggerConfig.js";
dbConnection();
try {
  await redisConnection();
  initLimiters();
} catch (err) {
  logger.fatal({ err }, "Redis connection failed — cannot start without rate limiting");
  process.exit(1);
}
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());

app.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.set("trust proxy", 1);
app.use(globalLimiter);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: "Express E-Commerce API Docs",
  customCss: ".swagger-ui .topbar { display: none }",
}));

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

app.listen(port, () => {
  logger.info(`Server is running successfully at port ${port}`);
});
