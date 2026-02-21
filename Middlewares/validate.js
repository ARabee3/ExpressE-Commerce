import { AppError } from "../Utils/Error/AppError.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const inputs = { ...req.body, ...req.params, ...req.query };
    const { error } = schema.validate(inputs, { abortEarly: false });
    if (error) {
      const errMsg = error.details.map((err) => err.message).join(", ");
      return next(new AppError(errMsg, 422));
    }
    next();
  };
};
