import joi from "joi";

export const orderValidation = joi.object({
  cartId: joi.string().hex().length(24).required().messages({
    "string.empty": "Cart ID can't be empty",
    "string.hex": "Cart ID must be a valid ObjectId",
    "string.length": "Cart ID must be 24 characters",
    "any.required": "Cart ID is required",
  }),
  addressId: joi.string().hex().length(24).messages({
    "string.hex": "Address ID must be a valid ObjectId",
    "string.length": "Address ID must be 24 characters",
  }),
  shippingAddress: joi
    .object({
      street: joi.string().min(3).max(150).required().messages({
        "string.empty": "Street can't be empty",
        "string.min": "Street can't be less than 3",
        "string.max": "Street can't be more than 150",
      }),
      city: joi.string().min(3).max(30).required().messages({
        "string.empty": "City can't be empty",
        "string.min": "City can't be less than 3",
        "string.max": "City can't be more than 30",
      }),
      state: joi.string().min(2).max(30).messages({
        "string.min": "State can't be less than 2",
        "string.max": "State can't be more than 30",
      }),
      phone: joi
        .string()
        .min(7)
        .max(20)
        .pattern(/^[0-9+\-() ]+$/)
        .messages({
          "string.min": "Phone must be at least 7 characters",
          "string.max": "Phone must not exceed 20 characters",
          "string.pattern.base":
            "Phone must contain only digits and + - ( ) spaces",
        }),
    }),
  paymentMethod: joi
    .string()
    .valid("Card", "Cash", "Wallet")
    .insensitive()
    .required()
    .messages({
      "string.empty": "Payment can't be empty",
      "any.only": "Payment method must be one of card , cash and wallet",
    }),
  status: joi
    .string()
    .valid("Pending", "Processing", "Shipped", "Delivered", "Cancelled")
    .insensitive()
    .messages({
      "any.only":
        "Status must be one of (Pending, Processing, Shipped, Delivered, Cancelled)",
    }),
}).xor("addressId", "shippingAddress").messages({
  "object.xor": "Provide either addressId or shippingAddress, not both",
  "object.missing": "Either addressId or shippingAddress is required",
});
