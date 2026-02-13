import express from "express";
import "dotenv/config";
import { dbConnection } from "./Database/dbConnection.js";
import { globalErrorHandler } from "./Middlewares/globalErrorHandler.js";
import { productModel } from "./Database/Models/product.model.js";
import productsRoutes from "./Modules/Product/product.routes.js";
import { orderModel } from "./Database/Models/order.model.js";
import orderRoutes from "./Modules/Order/order.routes.js";
import { categoryModel } from "./Database/Models/category.model.js";
import categoryRoutes from "./Modules/Category/category.routes.js";


dbConnection();
const app = express();

app.use(express.json());

app.use(globalErrorHandler);

orderModel;
categoryModel;
productModel;

app.use(categoryRoutes)
app.use(productsRoutes)
app.use(orderRoutes)

app.listen(3000, () => {
  console.log("Server is running successfully at port 3000");
});
