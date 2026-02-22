import { createClient } from "redis";
import "dotenv/config";
import logger from "../Utils/logger.js";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => logger.error({ err }, "Redis client error"));

export const redisConnection = async () => {
  try {
    await redisClient.connect();
    logger.info("Connected to Redis");
  } catch (err) {
    logger.fatal({ err }, "Redis connection failed");
    throw err;
  }
};
