import Joi from "joi";

// Validation for adding item to cart
export const addToCartValidation = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "Product ID cannot be empty",
      "string.pattern.base": "Product ID must be a valid MongoDB ObjectId",
      "any.required": "Product ID is required",
    }),
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "Quantity must be a number",
    "number.integer": "Quantity must be an integer",
    "number.min": "Quantity must be at least 1",
    "any.required": "Quantity is required",
  }),
  sessionId: Joi.string().optional().messages({
    "string.base": "Session ID must be a string",
  }),
});

// Validation for updating cart item quantity
export const updateQuantityValidation = Joi.object({
  itemId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "Item ID cannot be empty",
      "string.pattern.base": "Item ID must be a valid MongoDB ObjectId",
      "any.required": "Item ID is required",
    }),
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "Quantity must be a number",
    "number.integer": "Quantity must be an integer",
    "number.min": "Quantity must be at least 1",
    "any.required": "Quantity is required",
  }),
});

// Validation for applying coupon
export const applyCouponValidation = Joi.object({
  couponCode: Joi.string().required().trim().uppercase().messages({
    "string.empty": "Coupon code cannot be empty",
    "any.required": "Coupon code is required",
  }),
});

// Validation for checkout
export const checkoutValidation = Joi.object({
  shippingAddress: Joi.object({
    street: Joi.string().required().messages({
      "string.empty": "Street address cannot be empty",
      "any.required": "Street address is required",
    }),
    city: Joi.string().required().messages({
      "string.empty": "City cannot be empty",
      "any.required": "City is required",
    }),
    state: Joi.string().required().messages({
      "string.empty": "State cannot be empty",
      "any.required": "State is required",
    }),
  })
    .required()
    .messages({
      "any.required": "Shipping address is required",
    }),
  paymentMethod: Joi.string()
    .valid("Card", "Cash", "Wallet")
    .required()
    .messages({
      "string.empty": "Payment method cannot be empty",
      "any.only": "Payment method must be Card, Cash, or Wallet",
      "any.required": "Payment method is required",
    }),
});
