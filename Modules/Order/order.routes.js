import express from "express";
import { validateData } from "../../Middlewares/validationDate.js";
import { orderModel } from "../../Database/Models/order.model.js";
import { orderValidation } from "../../Validations/orderValidation.js";
import { isAuthor } from "../../Middlewares/isAuthor.js";
// import {
//   addOrder,
//   getUserOrders,
//   getOrderById,
//   cancelOrder,
//   updatePaidStatus,
// } from "./order.controller.js";

const orderRoutes = express.Router();

// orderRoutes.get("/orders", getUserOrders);
// orderRoutes.get("/orders/:id",isAuthor(orderModel, "order"), getOrderById);
// orderRoutes.post(
//   "/orders",
//   validateData(orderValidation),
//   isAuthor(cartModel, "cart"),
//   addOrder,
// );
// orderRoutes.put("orders/:id/cancel", cancelOrder);
// orderRoutes.put("/orders/:id/pay", updatePaidStatus);

export default orderRoutes;
