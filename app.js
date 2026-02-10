import express from "express";
import "dotenv/config";
import { dbConnection } from "./Database/dbConnection.js";
import { globalErrorHandler } from "./Middlewares/globalErrorHandler.js";
import { orderModel } from "./Database/Models/order.model.js";
import orderRoutes from "./Modules/Order/order.routes.js";
dbConnection();
const app = express();

app.use(express.json());

app.use(globalErrorHandler);

orderModel;
app.use(orderRoutes)
app.listen(3000, () => {
  console.log("Server is running successfully at port 3000");
});
