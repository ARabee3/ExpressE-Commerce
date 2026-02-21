import { couponModel } from "../../Database/Models/coupon.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";

export const createCoupon = catchAsync(async (req, res, next) => {
  const coupon = await couponModel.create(req.body);

  res.status(201).json({
    status: "success",
    message: "Coupon created successfully",
    data: coupon,
  });
});

export const getAllCoupons = catchAsync(async (req, res, next) => {
  const coupons = await couponModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: coupons,
  });
});

export const getCouponById = catchAsync(async (req, res, next) => {
  const coupon = await couponModel.findById(req.params.id);

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: coupon,
  });
});

export const updateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await couponModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Coupon updated successfully",
    data: coupon,
  });
});

export const deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await couponModel.findByIdAndDelete(req.params.id);

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Coupon deleted successfully",
  });
});
