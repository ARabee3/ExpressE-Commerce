import express from "express";
import { validate } from "../../Middlewares/validate.js";
import { userValidation } from "../../Validations/userValidation.js";
import { register, login, verifyEmail } from "./user.controller.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";
import {
  register,
  login,
  verifyEmail,
  refresh,
  logout,
} from "./user.controller.js";

const userRoutes = express.Router();

userRoutes.post("/register", validate(userValidation), register);
userRoutes.post("/login", login);
userRoutes.post("/logout", verifyToken, logout);
userRoutes.post("/refresh", verifyToken, refresh);
userRoutes.post("/verify-email", verifyToken, verifyEmail);
// userRoutes.post("/resend-verification", resendVerification);
// userRoutes.post("/forgot-password", forgotPassword);
// userRoutes.patch("/change-password", changePassword);

// userRoutes.post("/reset-password", resetPassword);
// userRoutes.get("/me", getProfile);
// userRoutes.patch("/update-profile", updateProfile);

export default userRoutes;
