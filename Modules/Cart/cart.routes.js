import express from "express";
import {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
} from "./cart.controller.js";
import { optionalAuth } from "../../Middlewares/verifyToken.js";
import { validate } from "../../Middlewares/validate.js";
import {
  addToCartValidation,
  updateQuantityValidation,
  applyCouponValidation,
} from "../../Validations/cartValidation.js";

const cartRoutes = express.Router();

// Add item to cart (guest or authenticated)
cartRoutes.post(
  "/cart",
  optionalAuth,
  validate(addToCartValidation),
  addToCart,
);

// Get cart (guest or authenticated)
cartRoutes.get("/cart", optionalAuth, getCart);

// Update cart item quantity
cartRoutes.patch(
  "/cart/items/:itemId",
  optionalAuth,
  validate(updateQuantityValidation),
  updateQuantity,
);

// Remove item from cart (soft delete)
cartRoutes.delete("/cart/items/:productId", optionalAuth, removeFromCart);

// Clear entire cart
cartRoutes.delete("/cart", optionalAuth, clearCart);

// Apply coupon to cart
cartRoutes.post(
  "/cart/coupon",
  optionalAuth,
  validate(applyCouponValidation),
  applyCoupon,
);

// Remove coupon from cart
cartRoutes.delete("/cart/coupon", optionalAuth, removeCoupon);

export default cartRoutes;

