import mongoose from "mongoose";
import "dotenv/config";
import logger from "../Utils/logger.js";

let cachedConnection = null;

export const dbConnection = async () => {
  // If we have a cached connection promise, wait for it and return
  if (cachedConnection) {
    return cachedConnection;
  }

  // If already connected, reuse connection and ensure promise is cached
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 2) {
    if (!cachedConnection) {
      cachedConnection = new Promise((resolve, reject) => {
        const onOpen = () => {
          mongoose.connection.removeListener("error", onError);
          resolve(mongoose);
        };
        const onError = (err) => {
          mongoose.connection.removeListener("open", onOpen);
          cachedConnection = null;
          reject(err);
        };

        mongoose.connection.once("open", onOpen);
        mongoose.connection.once("error", onError);
      });
    }
    return cachedConnection;
  }

  try {
    // bufferCommands: false causes errors immediately if operation is attempted while disconnected
    // successful await mongoose.connect() ensures we are connected before proceeding
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cachedConnection = mongoose
      .connect(process.env.MONGODB_URI, opts)
      .then((mongoose) => {
        logger.info("Connected to Database");
        return mongoose;
      });

    await cachedConnection;
  } catch (err) {
    logger.fatal({ err }, "Database connection failed");
    cachedConnection = null;
    throw err;
  }

  return cachedConnection;
};
