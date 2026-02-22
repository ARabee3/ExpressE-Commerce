import { describe, it, expect } from "vitest";
import { request } from "./helpers.js";

describe("GET /health", () => {
  it("should return 200 with healthy status when all services connected", async () => {
    const res = await request.get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.services.mongodb).toBe("connected");
    expect(res.body.services.redis).toBe("connected");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
  });
});
