import { createClient } from "redis";
import "dotenv/config";
import logger from "../Utils/logger.js";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => logger.error({ err }, "Redis client error"));

export const redisConnection = async () => {
  if (redisClient.isOpen) {
    return;
  }
  try {
    await redisClient.connect();
    logger.info("Connected to Redis");
  } catch (err) {
    // Check if the error is just "Socket already opened" which can happen in race conditions
    if (err.message === "Socket already opened") {
      return;
    }
    logger.fatal({ err }, "Redis connection failed");
    throw err;
  }
};
