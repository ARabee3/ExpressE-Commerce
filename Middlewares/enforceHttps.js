import { AppError } from "../Utils/Error/AppError.js";

/**
 * Redirects HTTP requests to HTTPS in production.
 * Checks the `x-forwarded-proto` header (set by reverse proxies like
 * Heroku, Railway, Render, AWS ALB, etc.).
 *
 * Only active when ENVIRONMENT=production — does nothing in development.
 */
export const enforceHttps = (req, res, next) => {
  if (
    process.env.ENVIRONMENT === "production" &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
  }
  next();
};
