import joi from "joi";

export const userValidation = joi.object({
  name: joi.string().trim().min(2).max(60).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must not exceed 60 characters",
  }),
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Email must be a valid email address",
    }),
  password: joi
    .string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .min(8)
    .max(128)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password must not exceed 128 characters",
      "string.pattern.base":
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
    }),
  phone: joi
    .string()
    .min(7)
    .max(20)
    .pattern(/^[0-9+\-() ]+$/)
    .required()
    .messages({
      "string.empty": "Phone is required",
      "string.min": "Phone must be at least 7 characters",
      "string.max": "Phone must not exceed 20 characters",
      "string.pattern.base":
        "Phone must contain only digits and + - ( ) spaces",
    }),
  role: joi
    .string()
    .valid("Customer", "Admin", "Seller")
    .insensitive()
    .messages({
      "any.only": "Role must be one of (Customer, Admin, Seller)",
    }),
  addresses: joi.array().items(
    joi.object({
      city: joi.string().trim().min(2).max(100).required().messages({
        "string.empty": "City is required",
        "string.min": "City must be at least 2 characters",
        "string.max": "City must not exceed 100 characters",
      }),
      street: joi.string().trim().min(3).max(200).required().messages({
        "string.empty": "Street is required",
        "string.min": "Street must be at least 3 characters",
        "string.max": "Street must not exceed 200 characters",
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
      isDefault: joi.boolean(),
    }),
  ),
});

export const addAddressValidation = joi.object({
  city: joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "City is required",
    "string.min": "City must be at least 2 characters",
    "string.max": "City must not exceed 100 characters",
  }),
  street: joi.string().trim().min(3).max(200).required().messages({
    "string.empty": "Street is required",
    "string.min": "Street must be at least 3 characters",
    "string.max": "Street must not exceed 200 characters",
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
  isDefault: joi.boolean(),
});

export const resetPasswordValidation = joi.object({
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Email must be a valid email address",
    }),
  otp: joi
    .string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.empty": "OTP is required",
      "string.length": "OTP must be 6 digits",
      "string.pattern.base": "OTP must contain only digits",
    }),
  newPassword: joi
    .string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .min(8)
    .max(128)
    .required()
    .messages({
      "string.empty": "New password is required",
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password must not exceed 128 characters",
      "string.pattern.base":
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
    }),
});

export const signInValidation = joi.object({
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Email must be a valid email address",
    }),
  password: joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});
