import Joi from "joi";

export const createCategoryValidation = Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
        "string.empty": "Category name is required",
        "string.min": "Category name must be at least 2 charchters",
        "string.max": "Category name must not exceed 50 characters"
    })
});