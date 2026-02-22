import "dotenv/config";
import mongoose from "mongoose";
import { redisClient } from "../Database/redisConnection.js";
import { initLimiters } from "../Middlewares/rateLimiter.js";

/**
 * Global test setup — runs once before all test files.
 * Connects to a separate test database to avoid polluting production data.
 */

// Derive a test database URI from the original
const getTestDbUri = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  // If the URI has a database name, append _test; otherwise add one
  const url = new URL(uri);
  const dbName = url.pathname.slice(1); // remove leading /
  if (dbName) {
    url.pathname = `/${dbName}_test`;
  } else {
    url.pathname = "/ecommerce_test";
  }
  return url.toString();
};

// ── Setup ───────────────────────────────────────────────
beforeAll(async () => {
  // Connect to test database
  const testUri = getTestDbUri();
  await mongoose.connect(testUri);

  // Connect Redis
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  initLimiters();
});

// ── Teardown ────────────────────────────────────────────
afterAll(async () => {
  // Drop the test database
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
  // Disconnect Redis
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
});
