import { AppError } from "../Utils/Error/AppError.js";

/**
 * Redirects HTTP requests to HTTPS in production.
 * Checks the `x-forwarded-proto` header (set by reverse proxies like
 * Heroku, Railway, Render, AWS ALB, etc.).
 *
 * Only active when NODE_ENV=production — does nothing in development.
 */
export const enforceHttps = (req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.headers["x-forwarded-proto"] &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
  }
  next();
};
