import { reviewModel } from "../../Database/Models/review.model.js";
import { productModel } from "../../Database/Models/product.model.js";
import { orderModel } from "../../Database/Models/order.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";

//create review
export const createReview = catchAsync(async (req, res, next) => {
  //check if product exist
  const product = await productModel.findById(req.body.product);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }
  //check if the user buy this product
  const hasBought = await orderModel.findOne({
    user: req.user._id,
    "orderItems.product": req.body.product,
  });
  if (!hasBought) {
    return next(
      new AppError("You can only review products you purchased", 403),
    );
  }

  const review = await reviewModel.create({
    review: req.body.review,
    rating: req.body.rating,
    user: req.user._id,
    product: req.body.product,
  });
  res.status(201).json({
    status: "success",
    data: review,
  });
  //console.log("Controller reached");
});

//get all reviews whith pagination
export const getProductReviews = catchAsync(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 5;
  const skip = (page - 1) * limit;

  const reviews = await reviewModel
    .find({ product: req.params.productId })
    .populate("user", "name")
    .skip(skip)
    .limit(limit);

  const total = await reviewModel.countDocuments({
    product: req.params.productId,
  });

  res.status(200).json({
    status: "success",
    results: reviews.length,
    total,
    page,
    data: reviews,
  });
});
//update Review
export const updateReview = catchAsync(async (req, res, next) => {
  const review = await reviewModel.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
    },
    {
      review: req.body.review,
      rating: req.body.rating,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!review) {
    return next(new AppError("Review not found ", 404));
  }

  res.status(200).json({
    status: "success",
    data: review,
  });
});

//delete review
export const deleteReview = catchAsync(async (req, res, next) => {
  const review = await reviewModel.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!review) {
    return next(new AppError("Review not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Review deleted successfully",
  });
});
