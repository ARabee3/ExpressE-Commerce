import express from "express";
import { validate } from "../../Middlewares/validate.js";
import { userValidation } from "../../Validations/userValidation.js";
import { register, login } from "./user.controller.js";

const userRoutes = express.Router();

userRoutes.post("/register", validate(userValidation), register);
userRoutes.post("/login", login);
//userRoutes.post("/logout", logout);
// userRoutes.post("/refresh", refresh);
// userRoutes.post("/verify-email", verifyEmail);
// userRoutes.post("/resend-verification", resendVerification);
// userRoutes.post("/forgot-password", forgotPassword);
// userRoutes.post("/reset-password", resetPassword);
// userRoutes.get("/me", getProfile);
// userRoutes.patch("/change-password", changePassword);
// userRoutes.patch("/update-profile", updateProfile);

export default userRoutes;
