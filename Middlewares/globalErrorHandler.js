export const globalErrorHandler = (err, req, res, next) => {
  const code = err.statusCode || 500;
  res.status(code).json({
    message: "Error",
    error: err.message,
    stack: err.stack,
  });
};
