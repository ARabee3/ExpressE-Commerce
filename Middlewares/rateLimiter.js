import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../Database/redisConnection.js";

let _globalLimiter = null;
let _authLimiter = null;
const isDevelopment = process.env.ENVIRONMENT === "development";

// Called from app.js after Redis is connected — rateLimit() runs at init time,
// not inside a request handler, so express-rate-limit's validation passes.
export const initLimiters = () => {
  if (isDevelopment) {
    _globalLimiter = null;
    _authLimiter = null;
    return;
  }

  _globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    message: {
      message: "Too many requests from this IP, please try again later.",
    },
  });

  _authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 80,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: "rl-auth:",
    }),
    keyGenerator: (req) => {
      if (req.user?.id) return String(req.user.id);
      const ip = req.ip || "";
      return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
    },
    validate: { keyGeneratorIpFallback: false },
    message: { message: "Too many login attempts. Please wait 15 minutes." },
  });
};

// Stable proxy references — safe to import in route files at module load time.
export const globalLimiter = (req, res, next) =>
  isDevelopment || !_globalLimiter ? next() : _globalLimiter(req, res, next);

export const authLimiter = (req, res, next) =>
  isDevelopment || !_authLimiter ? next() : _authLimiter(req, res, next);
