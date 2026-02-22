import joi from "joi";

export const sellerValidation = joi.object({
  storeName: joi.string().trim().min(2).max(60).required().messages({
    "string.empty": "Store Name is required",
    "string.min": "Store Name must be at least 2 characters",
    "string.max": "Store Name must not exceed 60 characters",
  }),
});
