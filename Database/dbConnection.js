import mongoose from "mongoose";
import "dotenv/config";
import logger from "../Utils/logger.js";

let cachedConnection = null;

export const dbConnection = async () => {
  // Check if we have a cached connection
  if (cachedConnection) {
    // If connected (1) or connecting (2), return the cached promise
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      return cachedConnection;
    }
    // Otherwise, the connection is dead/disconnecting, so nullify cache to reconnect
    cachedConnection = null;
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
