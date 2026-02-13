import { AppError } from "../Utils/Error/AppError.js";

export const globalErrorHandler = (err, req, res, next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err = new AppError(`Duplicate value for field: ${field}`, 409);
  }

  const code = err.statusCode || 500;
  res.status(code).json({
    message: "Error",
    error: err.message,
    // for development
    stack: err.stack,
  });
};
