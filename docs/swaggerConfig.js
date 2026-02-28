import { readFile } from "fs/promises";
import { resolve, join } from "path";
import YAML from "yaml";

const swaggerYaml = await readFile(
  resolve(process.cwd(), "docs/swagger.yaml"),
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
