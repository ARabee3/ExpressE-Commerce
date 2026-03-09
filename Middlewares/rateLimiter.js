import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../Database/redisConnection.js";

let _globalLimiter = null;
let _authLimiter = null;
let _chatbotLimiter = null;

// Called from app.js after Redis is connected — rateLimit() runs at init time,
// not inside a request handler, so express-rate-limit's validation passes.
export const initLimiters = () => {
  if (_globalLimiter) return; // Prevent re-initialization

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

  // Chatbot limiter — 20 messages per 15 minutes per user, keyed by userId
  _chatbotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: "rl-chatbot:",
    }),
    keyGenerator: (req) => {
      // Always keyed by authenticated user ID (chatbot routes require auth)
      return String(req.user?._id || req.user?.id || req.ip);
    },
    validate: { keyGeneratorIpFallback: false },
    message: {
      message:
        "You've sent too many messages. Please wait a few minutes before trying again.",
    },
  });
};

// Stable proxy references — safe to import in route files at module load time.
export const globalLimiter = (req, res, next) =>
  _globalLimiter ? _globalLimiter(req, res, next) : next();

export const authLimiter = (req, res, next) =>
  _authLimiter ? _authLimiter(req, res, next) : next();

export const chatbotLimiter = (req, res, next) =>
  _chatbotLimiter ? _chatbotLimiter(req, res, next) : next();
