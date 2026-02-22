import mongoose from "mongoose";
import "dotenv/config";
import logger from "../Utils/logger.js";

export const dbConnection = () => {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => logger.info("Connected to Database"))
    .catch((err) => {
      logger.fatal({ err }, "Database connection failed");
      process.exit(1);
    });
};
