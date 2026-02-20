import joi from "joi";

export const orderValidation = joi.object({
  cartId: joi.string().hex().length(24).required().messages({
    "string.empty": "Cart ID can't be empty",
    "string.hex": "Cart ID must be a valid ObjectId",
    "string.length": "Cart ID must be 24 characters",
    "any.required": "Cart ID is required",
  }),
  shippingAddress: joi
    .object({
      street: joi.string().min(3).max(150).required().messages({
        "string.empty": "Street can't be empty",
        "string.required": "Street is required",
        "string.min": "Street can't be less than 3",
        "string.max": "Street can't be more than 150",
      }),
      city: joi.string().min(3).max(30).required().messages({
        "string.empty": "City can't be empty",
        "string.required": "City is required",
        "string.min": "City can't be less than 3",
        "string.max": "City can't be more than 30",
      }),
      state: joi.string().min(3).max(30).required().messages({
        "string.empty": "State can't be empty",
        "string.required": "State is required",
        "string.min": "State can't be less than 3",
        "string.max": "State can't be more than 30",
      }),
    })
    .required(),
  paymentMethod: joi
    .string()
    .valid("Card", "Cash", "Wallet")
    .insensitive()
    .required()
    .messages({
      "string.empty": "Payment can't be empty",
      "ant.only": "Payment method must be one of card , cash and wallet",
    }),
  status: joi
    .string()
    .valid("Pending", "Processing", "Shipped", "Delivered", "Cancelled")
    .insensitive()
    .messages({
      "any.only":
        "Status must be one of (Pending, Processing, Shipped, Delivered, Cancelled)",
    }),
});
