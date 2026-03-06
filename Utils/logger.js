import pino from "pino";

// Use NODE_ENV for logger output format (Vercel sets it automatically).
// ENVIRONMENT may be "production" even locally for API URLs, etc.
const isProduction = process.env.NODE_ENV === "production";

function createLogger() {
  if (isProduction) {
    // Production: structured JSON (safe for serverless / Vercel)
    return pino({
      level: process.env.LOG_LEVEL || "info",
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  // Development: try pino-pretty, fall back to plain pino
  try {
    return pino({
      level: process.env.LOG_LEVEL || "debug",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    });
  } catch {
    return pino({ level: process.env.LOG_LEVEL || "debug" });
  }
}

const logger = createLogger();

export default logger;
