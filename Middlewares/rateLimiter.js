import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../Database/redisConnection.js";

// Lazily create the limiter on first request so Redis is guaranteed to be
// connected by then (avoids "ClientClosedError" during module init).
const createLimiter = ({ _storePrefix, ...options }) => {
  let limiter;
  return (req, res, next) => {
    if (!limiter) {
      limiter = rateLimit({
        ...options,
        store: new RedisStore({
          sendCommand: (...args) => redisClient.sendCommand(args),
          ...(_storePrefix ? { prefix: _storePrefix } : {}),
        }),
      });
    }
    return limiter(req, res, next);
  };
};

export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    message: "Too many requests from this IP, please try again later.",
  },
});

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  _storePrefix: "rl-auth:",
  keyGenerator: (req) => {
    if (req.user?.id) return String(req.user.id);
    const ip = req.ip || "";
    return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  },
  validate: { keyGeneratorIpFallback: false },
  message: { message: "Too many login attempts. Please wait 15 minutes." },
});
