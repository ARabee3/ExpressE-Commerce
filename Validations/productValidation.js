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

export const updateProductValidation = Joi.object({
  
    id: Joi.string().hex().length(24).required().messages({
      "string.base": "Product ID must be a string",
      "string.hex": "Product ID must be a valid MongoDB ObjectId",
      "string.length": "Product ID must be exactly 24 characters",
      "any.required": "Product ID is required",
   
  }),

 
    name: Joi.string().min(3).max(100).trim().messages({
      "string.base": "Product name must be a string",
      "string.min": "Product name must be at least 3 characters",
      "string.max": "Product name must not exceed 100 characters",
    }),

    description: Joi.string().min(10).max(2000).messages({
      "string.base": "Description must be a string",
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description must not exceed 2000 characters",
    }),

    price: Joi.number().min(0).messages({
      "number.base": "Price must be a number",
      "number.min": "Price cannot be negative",
    }),

    stock: Joi.number().integer().min(0).messages({
      "number.base": "Stock must be a number",
      "number.integer": "Stock must be an integer",
      "number.min": "Stock cannot be negative",
    }),

    images: Joi.array()
      .items(
        Joi.string().uri().messages({
          "string.uri": "Each image must be a valid URL",
        }),
      )
      .min(1)
      .messages({
        "array.base": "Images must be an array",
        "array.min": "Product must have at least one image",
      }),

    category: Joi.string().hex().length(24).messages({
      "string.hex": "Category must be a valid MongoDB ObjectId",
      "string.length": "Category ID must be exactly 24 characters",
    }),
 
    
});

export const deleteProductValidation = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    "string.base": "Product ID must be a string",
    "string.hex": "Product ID must be a valid MongoDB ObjectId",
    "string.length": "Product ID must be exactly 24 characters",
    "any.required": "Product ID is required",
  }),
});
