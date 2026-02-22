import "dotenv/config";
import logger from "./Utils/logger.js";
import { dbConnection } from "./Database/dbConnection.js";
import { redisConnection } from "./Database/redisConnection.js";
import { initLimiters } from "./Middlewares/rateLimiter.js";
import { createApp } from "./createApp.js";

dbConnection();
try {
  await redisConnection();
  initLimiters();
} catch (err) {
  logger.fatal({ err }, "Redis connection failed — cannot start without rate limiting");
  process.exit(1);
}

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`Server is running successfully at port ${port}`);
});
