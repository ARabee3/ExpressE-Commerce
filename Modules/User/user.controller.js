import { userModel } from "../../Database/Models/user.model.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendMailEvent } from "../../Utils/Events/sendEmailEvent.js";
import { redisClient } from "../../Database/redisConnection.js";

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
    return next(new AppError("Invalid Email or Password", 401));
  }

  if (!foundUser.isVerified) {
    return next(new AppError("Please Confirm Your Email First", 401));
  }

  const match = await bcrypt.compare(req.body.password, foundUser.password);
  if (match) {
    const token = foundUser.generateToken();
    res.json({ success: true, data: token });
  } else {
    return next(new AppError("Email or Password Invalid", 401));
  }
});

const verifyEmail = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const { email } = req.user;
  if (!otp) return next(new AppError("OTP is required", 400));

  const storedOtp = await redisClient.get(email);

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

  await redisClient.del(email);

  return res.json({
    success: true,
    message: "Your account has been verified",
  });
});

export { register, login, verifyEmail };
