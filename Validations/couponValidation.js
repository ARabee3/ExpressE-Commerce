import Joi from "joi";

export const createCouponValidation = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    "string.empty": "Coupon code cannot be empty",
    "any.required": "Coupon code is required",
  }),
  discountType: Joi.string().valid("percentage", "fixed").required().messages({
    "string.empty": "Discount type cannot be empty",
    "any.only": "Discount type must be percentage or fixed",
    "any.required": "Discount type is required",
  }),
  discount: Joi.number().min(0).required().messages({
    "number.base": "Discount must be a number",
    "number.min": "Discount cannot be negative",
    "any.required": "Discount is required",
  }),
  expireDate: Joi.date().greater("now").required().messages({
    "date.base": "Expire date must be a valid date",
    "date.greater": "Expire date must be in the future",
    "any.required": "Expire date is required",
  }),
  usageLimit: Joi.number().integer().min(1).required().messages({
    "number.base": "Usage limit must be a number",
    "number.integer": "Usage limit must be an integer",
    "number.min": "Usage limit must be at least 1",
    "any.required": "Usage limit is required",
  }),
  isActive: Joi.boolean().optional().messages({
    "boolean.base": "isActive must be true or false",
  }),
})
  .custom((value, helpers) => {
    if (value.discountType === "percentage" && value.discount > 100) {
      return helpers.error("any.invalid");
    }
    return value;
  }, "percentage discount validation")
  .messages({
    "any.invalid": "Percentage discount cannot be greater than 100",
  });

export const updateCouponValidation = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "Coupon ID cannot be empty",
      "string.pattern.base": "Coupon ID must be a valid MongoDB ObjectId",
      "any.required": "Coupon ID is required",
    }),
  code: Joi.string().trim().uppercase().optional().messages({
    "string.empty": "Coupon code cannot be empty",
  }),
  discountType: Joi.string().valid("percentage", "fixed").optional().messages({
    "any.only": "Discount type must be percentage or fixed",
  }),
  discount: Joi.number().min(0).optional().messages({
    "number.base": "Discount must be a number",
    "number.min": "Discount cannot be negative",
  }),
  expireDate: Joi.date().optional().messages({
    "date.base": "Expire date must be a valid date",
  }),
  usageLimit: Joi.number().integer().min(1).optional().messages({
    "number.base": "Usage limit must be a number",
    "number.integer": "Usage limit must be an integer",
    "number.min": "Usage limit must be at least 1",
  }),
  isActive: Joi.boolean().optional().messages({
    "boolean.base": "isActive must be true or false",
  }),
})
  .custom((value, helpers) => {
    if (value.discountType === "percentage" && value.discount > 100) {
      return helpers.error("any.invalid");
    }
    return value;
  }, "percentage discount validation")
  .messages({
    "any.invalid": "Percentage discount cannot be greater than 100",
  });
