import express from "express";
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
  trackOrder,
} from "./order.controller.js";
import { validate } from "../../Middlewares/validate.js";

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
  validate(orderValidation),
  isAuthor(cartModel, "cart"),
  addOrder,
);
orderRoutes.put(
  "/orders/:id/cancel",
  verifyToken,
  isAuthor(orderModel, "order"),
  cancelOrder,
);
orderRoutes.post("/orders/:id/pay-intent", verifyToken, createPaymentIntent);
orderRoutes.put(
  "/orders/:id/pay",
  verifyToken,
  isAuthor(orderModel, "order"),
  updatePaidStatus,
);
orderRoutes.get(
  "/orders/:id/track",
  verifyToken,
  isAuthor(orderModel, "order"),
  trackOrder,
);
export default orderRoutes;
