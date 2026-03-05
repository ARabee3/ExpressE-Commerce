import { createApp } from "../createApp.js";
import { dbConnection } from "../Database/dbConnection.js";
import { redisConnection } from "../Database/redisConnection.js";
import { initLimiters } from "../Middlewares/rateLimiter.js";

// Cache the app instance
let app;

export default async function handler(req, res) {
  // 1. Ensure DB is connected
  try {
    await dbConnection();
  } catch (error) {
    console.error("DB Connection Failed", error);
    return res.status(500).json({ error: "Database Connection Failed" });
  }

  // 2. Ensure Redis is connected.
  try {
    await redisConnection();
    initLimiters();
  } catch (error) {
    console.error("Redis Connection Failed", error);
    // Proceed without rate limiting if Redis fails - or fail if critical
  }

  // 3. Initialize app if not already initialized
  if (!app) {
    app = createApp();
  }

  // 4. Pass request to Express
  return app(req, res);
}
