import Joi from "joi";
export const createReviewValidation = Joi.object({
  review: Joi.string().min(5).max(500).required().messages({
    "string.min": "Review must be at least 5 characters",
    "string.max": "Review cannot exceed 500 characters",
    "any.required": "Review comment is required",
  }),
  rating: Joi.number().min(1).max(5).required().messages({
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
    "any.required": "Rating is required",
  }),
  product: Joi.string().hex().length(24).required().messages({
    "string.hex": "Product must be a valid MongoDB ObjectId",
    "string.length": "Product ID must be exactly 24 characters",
    "any.required": "Product ID is required",
  }),
});

export const updateReviewValidation = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    "string.base": "Review ID must be a string",
    "string.empty": "Review ID is required",
    "string.hex": "Review ID must be a valid MongoDB ObjectId",
    "string.length": "Review ID must be exactly 24 characters",
    "any.required": "Review ID is required",
  }),
  review: Joi.string().min(5).max(500).messages({
    "string.base": "Review must be a string",
    "string.empty": "Review cannot be empty",
    "string.min": "Review must be at least 5 characters long",
    "string.max": "Review cannot exceed 500 characters",
  }),

  rating: Joi.number().min(1).max(5).messages({
    "number.base": "Rating must be a number",
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
  }),
})
  .min(1)
  .messages({
    "object.min": "You must provide at least one field to update",
  });

export const deleteReviewValidation = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    "string.base": "Review ID must be a string",
    "string.empty": "Review ID is required",
    "string.hex": "Review ID must be a valid MongoDB ObjectId",
    "string.length": "Review ID must be exactly 24 characters",
    "any.required": "Review ID is required",
  }),
});
