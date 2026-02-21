import express from "express";
import { validate } from "../../Middlewares/validate.js";
import {
  userValidation,
  addAddressValidation,
  resetPasswordValidation,
  changePasswordValidation,
  updateProfileValidation,
} from "../../Validations/userValidation.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";
import {
  register,
  login,
  verifyEmail,
  refresh,
  logout,
  resendVerification,
  addAddress,
  removeAddress,
  setDefaultAddress,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  addToWishlist,
  removeFromWishlist,
} from "./user.controller.js";
import { authLimiter } from "../../Middlewares/rateLimiter.js";

const userRoutes = express.Router();

userRoutes.post("/register", authLimiter, validate(userValidation), register);
userRoutes.post("/login", authLimiter, login);
userRoutes.post("/logout", verifyToken, authLimiter, logout);
userRoutes.post("/refresh", verifyToken, authLimiter, refresh);
userRoutes.post("/verify-email", verifyToken, authLimiter, verifyEmail);
userRoutes.post("/resend-verification", authLimiter, resendVerification);

userRoutes.patch(
  "/address",
  verifyToken,
  authLimiter,
  validate(addAddressValidation),
  addAddress,
);
userRoutes.delete("/address/:id", verifyToken, authLimiter, removeAddress);
userRoutes.patch(
  "/address/:id/default",
  verifyToken,
  authLimiter,
  setDefaultAddress,
);

userRoutes.post("/forgot-password", authLimiter, forgotPassword);
userRoutes.patch(
  "/reset-password",
  authLimiter,
  validate(resetPasswordValidation),
  resetPassword,
);

userRoutes.patch(
  "/change-password",
  verifyToken,
  validate(changePasswordValidation),
  changePassword,
);
userRoutes.get("/me", verifyToken, getProfile);
userRoutes.patch(
  "/update-profile",
  verifyToken,
  validate(updateProfileValidation),
  updateProfile,
);
userRoutes.patch("/wishlist/:productId", verifyToken, addToWishlist);
userRoutes.delete("/wishlist/:productId", verifyToken, removeFromWishlist);

export default userRoutes;

