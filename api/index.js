import "dotenv/config";
import { dbConnection } from "../Database/dbConnection.js";
import { redisConnection } from "../Database/redisConnection.js";
import { initLimiters } from "../Middlewares/rateLimiter.js";
import { createApp } from "../createApp.js";
import logger from "../Utils/logger.js";

/*
 * Vercel serverless adapter.
 *
 * - Connections (MongoDB, Redis) are established once per cold start
 *   and cached across warm invocations.
 * - If Redis is unreachable, the app still works — rate limiting
 *   is skipped gracefully (see rateLimiter.js proxy pattern).
 * - The existing app.js entry point is NOT modified; this file is
 *   only used by Vercel.
 */

let initialized = false;

async function init() {
  if (initialized) return;

  dbConnection();

  try {
    await redisConnection();
    initLimiters();
  } catch (err) {
    logger.warn({ err }, "Redis unavailable in serverless — rate limiting disabled");
  }

  initialized = true;
}

const app = createApp();

export default async function handler(req, res) {
  await init();
  return app(req, res);
}
