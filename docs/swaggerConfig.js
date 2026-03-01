import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getSwaggerDocument = async () => {
  try {
    const swaggerYaml = await readFile(
      resolve(__dirname, "swagger.yaml"),
      "utf-8",
    );

    const swaggerDocument = YAML.parse(swaggerYaml);

    // Dynamically set server URL from environment
    swaggerDocument.servers = [
      {
        url: process.env.BASE_URL || "http://localhost:3000",
        description:
          process.env.ENVIRONMENT === "production"
            ? "Production"
            : "Development",
      },
    ];

    return swaggerDocument;
  } catch (error) {
    console.error("Failed to load Swagger document:", error);
    // Return a minimal valid Swagger object to avoid crashes
    return {
      openapi: "3.0.0",
      info: {
        title: "API Documentation Error",
        version: "1.0.0",
        description:
          "Failed to load API documentation. Please check server logs.",
      },
      paths: {},
    };
  }
};
