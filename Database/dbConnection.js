import mongoose from "mongoose";
import "dotenv/config";
import logger from "../Utils/logger.js";

export const dbConnection = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("Connected to Database");
  } catch (err) {
    logger.fatal({ err }, "Database connection failed");
    // Do not exit process in serverless, let it throw or handle gracefully
    throw err;
  }
};
