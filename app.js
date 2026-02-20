import express from "express";
import "dotenv/config";
import { dbConnection } from "./Database/dbConnection.js";
import { redisConnection } from "./Database/redisConnection.js";
import { globalErrorHandler } from "./Middlewares/globalErrorHandler.js";
import { productModel } from "./Database/Models/product.model.js";
import productsRoutes from "./Modules/Product/product.routes.js";
import { orderModel } from "./Database/Models/order.model.js";
import orderRoutes from "./Modules/Order/order.routes.js";
import { categoryModel } from "./Database/Models/category.model.js";
import categoryRoutes from "./Modules/Category/category.routes.js";
import userRoutes from "./Modules/User/user.routes.js";
import adminRouter from "./Modules/Admin/admin.routes.js";
import cookieParser from "cookie-parser";
import "./Utils/Events/sendEmailEvent.js";

import { cartModel } from "./Database/Models/cart.model.js";
import { couponModel } from "./Database/Models/coupon.model.js";
import cartRoutes from "./Modules/Cart/cart.routes.js";
import helmet from "helmet";

dbConnection();
redisConnection();
const app = express();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(helmet());
app.use(cookieParser());

orderModel;
categoryModel;
productModel;
cartModel;
couponModel;

app.use(userRoutes);
app.use(categoryRoutes);
app.use(productsRoutes);
app.use(cartRoutes);
app.use(orderRoutes);
app.use("/admin", adminRouter);
app.use(globalErrorHandler);

app.listen(port, () => {
  console.log("Server is running successfully at port 3000");
});
