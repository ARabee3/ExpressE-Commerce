import Joi from "joi";

export const productValidation = Joi.object({
  name: Joi.string().min(3).required().messages({
    "string.empty": "name can't be empty",
    "string.required": "name is required",
    "string.min": "name can't be less than 3",
  }),
  description: Joi.string().min(5).required().messages({
    "string.empty": "description can't be empty",
    "string.required": "description is required",
    "string.min": "description can't be less than 5",
  }),
  price: Joi.number().min(0).required().messages({
    "number.base": "price must be a number",
    "number.min": "price cannot be negative",
    "any.required": "price is required",
  }),
  images: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.base": "Images must be an array",
    "array.min": "At least one image is required",
    "any.required": "Images are required",
  }),
  stock: Joi.number().min(0).messages({
    "number.base": "stock must be a number",
    "number.min": "stock cannot be negative",
    "any.required": "stock is required",
  }),
  category: Joi.string().required().messages({
    "string.empty": "category can't be empty",
    "string.required": "category is required",
  }),
});
