import express from "express";
import {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
} from "./review.controller.js";
import {
  createReviewValidation,
  updateReviewValidation,
  deleteReviewValidation,
} from "../../Validations/reviewValidation.js";
import { validate } from "../../Middlewares/validate.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";

const reviewRoutes = express.Router();

reviewRoutes.post(
  "/reviews",
  verifyToken,
  validate(createReviewValidation),
  createReview,
);
reviewRoutes.get(
  "/products/:productId/reviews",
  verifyToken,
  getProductReviews,
);
reviewRoutes.patch(
  "/reviews/:id",
  verifyToken,
  validate(updateReviewValidation),
  updateReview,
);
reviewRoutes.delete(
  "/reviews/:id",
  verifyToken,
  validate(deleteReviewValidation),
  deleteReview,
);

export default reviewRoutes;
