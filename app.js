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
import "./Utils/Events/sendEmailEvent.js";

import { cartModel } from "./Database/Models/cart.model.js";
import { couponModel } from "./Database/Models/coupon.model.js";
// import cartRoutes from "./Modules/Cart/cart.routes.js";

dbConnection();
redisConnection();
const app = express();

app.use(express.json());

orderModel;
categoryModel;
productModel;
cartModel;
couponModel;

app.use(userRoutes);
app.use(categoryRoutes);
app.use(productsRoutes);
app.use(orderRoutes);
app.use(adminRouter);

// app.use(cartRoutes)
app.use(globalErrorHandler);

app.listen(3000, () => {
  console.log("Server is running successfully at port 3000");
});
