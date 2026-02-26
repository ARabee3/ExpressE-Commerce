/**
 * Recursively strips keys starting with '$' or containing '.'
 * to prevent NoSQL injection attacks.
 *
 * express-mongo-sanitize is incompatible with Express 5
 * (req.query is a read-only getter), so this is a custom implementation.
 */
const sanitize = (obj) => {
  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else {
        sanitize(obj[key]);
      }
    }
  }
  return obj;
};

export const sanitizeNoSQL = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
};
