import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));

const swaggerYaml = await readFile(
  join(__dirname, "swagger.yaml"),
  "utf-8",
);

const swaggerDocument = YAML.parse(swaggerYaml);

// Dynamically set server URL from environment
swaggerDocument.servers = [
  {
    url: process.env.BASE_URL || "http://localhost:3000",
    description: process.env.ENVIRONMENT === "production" ? "Production" : "Development",
  },
];

export default swaggerDocument;
