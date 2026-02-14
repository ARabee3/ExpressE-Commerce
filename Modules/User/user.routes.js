import express from "express";
import { validate } from "../../Middlewares/validate.js";
import { userValidation } from "../../Validations/userValidation.js";
import { register, login, verifyEmail } from "./user.controller.js";
import verifyToken from "../../Middlewares/verifyToken.js";

const userRoutes = express.Router();

userRoutes.post("/register", validate(userValidation), register);
userRoutes.post("/login", login);
//userRoutes.post("/logout", logout);
// userRoutes.post("/refresh", refresh);
userRoutes.post("/verify-email", verifyToken, verifyEmail);
// userRoutes.post("/resend-verification", resendVerification);
// userRoutes.post("/forgot-password", forgotPassword);
// userRoutes.post("/reset-password", resetPassword);
// userRoutes.get("/me", getProfile);
// userRoutes.patch("/change-password", changePassword);
// userRoutes.patch("/update-profile", updateProfile);

export default userRoutes;
