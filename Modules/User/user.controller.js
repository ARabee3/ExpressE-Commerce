import { userModel } from "../../Database/Models/user.model.js";
import { productModel } from "../../Database/Models/product.model.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendMailEvent } from "../../Utils/Events/sendEmailEvent.js";
import { redisClient } from "../../Database/redisConnection.js";
import { mergeGuestCart } from "../Cart/cart.controller.js";

const register = catchAsync(async (req, res, next) => {
  const newUser = await userModel.create(req.body);
  sendMailEvent.emit("register", newUser);

  const token = newUser.generateToken();

  newUser.password = undefined;
  res.status(201).json({
    success: true,
    message: "A Verification email has been sent to your email.",
    data: newUser,
    token, // Return token so user can verify immediately
  });
});

const login = catchAsync(async (req, res, next) => {
  const foundUser = await userModel
    .findOne({ email: req.body.email, isDeleted: false })
    .select("+password");

  if (!foundUser) {
    //fake compare to keep response time identical
    await bcrypt.compare(req.body.password, req.body.email);
    return next(new AppError("Invalid Email or Password", 401));
  }

  if (!foundUser.isVerified) {
    return next(new AppError("Please Confirm Your Email First", 401));
  }

  const match = await bcrypt.compare(req.body.password, foundUser.password);
  if (match) {
    const token = foundUser.generateToken();

    const refreshToken = foundUser.generateRefreshToken();
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      //secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Merge guest cart if sessionId provided
    const sessionId = req.body.sessionId || req.headers["x-session-id"];
    if (sessionId) {
      await mergeGuestCart(foundUser._id, sessionId);
    }

    res.json({ success: true, data: token });
  } else {
    return next(new AppError("Email or Password Invalid", 401));
  }
});

const verifyEmail = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const { email } = req.user;
  if (!otp) return next(new AppError("OTP is required", 400));

  const storedOtp = await redisClient.get(`verify:${email}`);

  if (String(otp) !== String(storedOtp)) {
    return next(new AppError("Invalid or Expired OTP", 401));
  }

  const updatedUser = await userModel.findByIdAndUpdate(
    req.user._id,
    { isVerified: true },
    { new: true },
  );

  if (!updatedUser) {
    return next(new AppError("User not found or update failed", 404));
  }

  await redisClient.del(`verify:${email}`);

  return res.json({
    success: true,
    message: "Your account has been verified",
  });
});

const refresh = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return next(new AppError("Access Denied", 401));

  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

  const user = await userModel.findById(decoded._id);
  if (!user || user.isDeleted) {
    return next(new AppError("User not found or deleted", 401));
  }

  const newAccessToken = user.generateToken();

  res.json({ success: true, data: newAccessToken });
});

// auth.routes.js

const logout = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) return next(new AppError("Access Denied.", 401));

  res.clearCookie("refreshToken", {
    httpOnly: true,
    // secure: true,
    // sameSite: 'Strict',
  });
  return res.status(200).json({
    success: true,
    message: "Logged out successfully. See ya!",
  });
});

const resendVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new AppError("Email is required", 400));

  const user = await userModel.findOne({ email });
  if (!user) return next(new AppError("User not found", 404));

  if (user.isVerified)
    return next(new AppError("User is already verified", 400));

  const existingOtp = await redisClient.get(`verify:${email}`);
  if (existingOtp)
    return next(new AppError("Please wait before requesting a new OTP", 429));

  sendMailEvent.emit("register", user);

  return res.status(200).json({
    success: true,
    message: "Verification email resent successfully",
  });
});

const addAddress = catchAsync(async (req, res, next) => {
  const user = await userModel.findById(req.user._id);
  if (!user) return next(new AppError("User not found", 404));

  if (!req.body.phone) {
    req.body.phone = user.phone;
  }

  if (user.addresses.length === 0 || req.body.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
    req.body.isDefault = true;
  }

  user.addresses.push(req.body);
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: "Address added successfully",
    data: user.addresses,
  });
});

const removeAddress = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findById(req.user._id);
  if (!user) return next(new AppError("User not found", 404));

  const address = user.addresses.id(id);
  if (!address) return next(new AppError("Address not found", 404));

  // Pre-check before mutating: prevent deleting the only remaining address
  if (user.addresses.length === 1) {
    return next(new AppError("Cannot delete your only remaining address", 422));
  }

  const wasDefault = address.isDefault;
  user.addresses.pull(id);

  // If deleted address was default, promote the first remaining one
  if (wasDefault) {
    user.addresses[0].isDefault = true;
  }

  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: "Address removed successfully",
    data: user.addresses,
  });
});

const setDefaultAddress = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findById(req.user._id);
  if (!user) return next(new AppError("User not found", 404));

  const address = user.addresses.id(id);
  if (!address) return next(new AppError("Address not found", 404));

  user.addresses.forEach((addr) => (addr.isDefault = false));
  address.isDefault = true;
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: "Default address updated",
    data: user.addresses,
  });
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError("Need Valid Email.", 400));
  const user = await userModel.findOne({ email, isDeleted: false });

  // Always return the same response to prevent user enumeration
  if (!user) {
    return res.json({
      success: true,
      message: "If an account exists, an email has been sent with the OTP.",
    });
  }

  sendMailEvent.emit("forgot-password", user);

  return res.json({
    success: true,
    message: "If an account exists, an email has been sent with the OTP.",
  });
});

const resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  const user = await userModel.findOne({ email, isDeleted: false });
  if (!user) return next(new AppError("Invalid or expired OTP", 401));

  const storedOtp = await redisClient.get(`reset:${email}`);
  if (!storedOtp || String(otp) !== String(storedOtp)) {
    return next(new AppError("Invalid or expired OTP", 401));
  }

  user.password = newPassword;
  await user.save();

  await redisClient.del(`reset:${email}`);

  return res.status(200).json({
    success: true,
    message: "Password reset successfully. You can now log in.",
  });
});

const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await userModel.findById(req.user._id).select("+password");
  if (!user) return next(new AppError("User not found", 404));

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return next(new AppError("Current password is incorrect", 401));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

const getProfile = catchAsync(async (req, res, next) => {
  const user = await userModel
    .findById(req.user._id)
    .populate("wishlist", "name price images");

  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({
    success: true,
    data: user,
  });
});

const updateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = ["name", "phone"];
  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return next(new AppError("No valid fields to update", 400));
  }

  const user = await userModel.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

const addToWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const product = await productModel.findById(productId);
  if (!product) return next(new AppError("Product not found", 404));

  const user = await userModel
    .findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: productId } },
      { new: true },
    )
    .populate("wishlist", "name price images");

  res.status(200).json({
    success: true,
    message: "Product added to wishlist",
    data: user.wishlist,
  });
});

const removeFromWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const user = await userModel
    .findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: productId } },
      { new: true },
    )
    .populate("wishlist", "name price images");

  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({
    success: true,
    message: "Product removed from wishlist",
    data: user.wishlist,
  });
});

export {
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
};
