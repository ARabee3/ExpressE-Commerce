import { createClient } from "redis";
import "dotenv/config";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

export const redisConnection = async () => {
  try {
    await redisClient.connect();
    console.log("Connected To Redis");
  } catch (err) {
    console.log("Redis Connection Failed:", err);
  }
};
