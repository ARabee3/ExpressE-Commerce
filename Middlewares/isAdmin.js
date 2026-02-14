import { AppError } from "../Utils/Error/AppError.js";

export const isAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return next(new AppError("Access denied. Admin only can access it",403));
  }

  next()
};
