import express from "express";
import { validateData } from "../../Middlewares/validationDate.js";
import { orderModel } from "../../Database/Models/order.model.js";
import { orderValidation } from "../../Validations/orderValidation.js";
import { isAuthor } from "../../Middlewares/isAuthor.js";
import { cartModel } from "../../Database/Models/cart.model.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";
import {
  addOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updatePaidStatus,
  createPaymentIntent,
} from "./order.controller.js";

const orderRoutes = express.Router();

orderRoutes.get("/orders", verifyToken, getUserOrders);
orderRoutes.get(
  "/orders/:id",
  verifyToken,
  isAuthor(orderModel, "order"),
  getOrderById,
);
orderRoutes.post(
  "/orders",
  verifyToken,
  validateData(orderValidation),
  isAuthor(cartModel, "cart"),
  addOrder,
);
orderRoutes.put("/orders/:id/cancel", verifyToken, cancelOrder);
orderRoutes.post("/orders/:id/pay-intent", verifyToken, createPaymentIntent);
orderRoutes.put("/orders/:id/pay", verifyToken, updatePaidStatus);
export default orderRoutes;
