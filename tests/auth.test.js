import { describe, it, expect, beforeAll } from "vitest";
import { request, createTestUser } from "./helpers.js";
import { redisClient } from "../Database/redisConnection.js";

describe("Auth", () => {
  // ── Register ────────────────────────────────────────
  describe("POST /register", () => {
    it("should register a new user and return 201", async () => {
      const res = await request.post("/register").send({
        name: "Auth Test",
        email: `auth_reg_${Date.now()}@test.com`,
        password: "Test@1234",
        phone: "+201012345678",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.email).toBeDefined();
      // Password should not be in response
      expect(res.body.data.password).toBeUndefined();
    });

    it("should reject duplicate email with 409", async () => {
      const email = `dup_${Date.now()}@test.com`;
      // First registration
      await request.post("/register").send({
        name: "First",
        email,
        password: "Test@1234",
        phone: "+201012345678",
      });
      // Duplicate
      const res = await request.post("/register").send({
        name: "Second",
        email,
        password: "Test@1234",
        phone: "+201012345678",
      });

      expect(res.status).toBe(409);
    });

    it("should reject weak password with 422", async () => {
      const res = await request.post("/register").send({
        name: "Weak Pass",
        email: `weak_${Date.now()}@test.com`,
        password: "123",
        phone: "+201012345678",
      });

      expect(res.status).toBe(422);
    });

    it("should not allow registering as Admin", async () => {
      const res = await request.post("/register").send({
        name: "Sneaky Admin",
        email: `sneaky_${Date.now()}@test.com`,
        password: "Test@1234",
        phone: "+201012345678",
        role: "Admin",
      });

      // Should be rejected by validation (Admin not in allowed roles)
      expect(res.status).toBe(422);
    });
  });

  // ── Login ───────────────────────────────────────────
  describe("POST /login", () => {
    it("should reject login for unverified user", async () => {
      const { user } = await createTestUser({}, false); // not verified
      const res = await request.post("/login").send({
        email: user.email,
        password: "Test@1234",
      });

      expect(res.status).toBe(401);
    });

    it("should reject wrong password", async () => {
      const { user } = await createTestUser();
      const res = await request.post("/login").send({
        email: user.email,
        password: "WrongP@ss1",
      });

      expect(res.status).toBe(401);
    });

    it("should login verified user and return token", async () => {
      const { user } = await createTestUser();
      const res = await request.post("/login").send({
        email: user.email,
        password: "Test@1234",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined(); // JWT token
      // Should set refresh token cookie
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const hasRefresh = cookies.some((c) => c.startsWith("refreshToken="));
      expect(hasRefresh).toBe(true);
    });
  });

  // ── Verify Email ────────────────────────────────────
  describe("POST /verify-email", () => {
    it("should verify email with correct OTP", async () => {
      const { user, token } = await createTestUser({}, false);

      // Manually set OTP in Redis (simulating the email flow)
      const otp = "123456";
      await redisClient.set(`verify:${user.email}`, otp, { EX: 300 });

      const res = await request
        .post("/verify-email")
        .set("Authorization", `Bearer ${token}`)
        .send({ otp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject wrong OTP", async () => {
      const { user, token } = await createTestUser({}, false);
      await redisClient.set(`verify:${user.email}`, "123456", { EX: 300 });

      const res = await request
        .post("/verify-email")
        .set("Authorization", `Bearer ${token}`)
        .send({ otp: "999999" });

      expect(res.status).toBe(401);
    });
  });

  // ── Profile ─────────────────────────────────────────
  describe("GET /me", () => {
    it("should return user profile", async () => {
      const { token } = await createTestUser();

      const res = await request
        .get("/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("name");
      expect(res.body.data).toHaveProperty("email");
    });

    it("should reject unauthenticated request", async () => {
      const res = await request.get("/me");
      expect(res.status).toBe(401);
    });
  });

  // ── Change Password ─────────────────────────────────
  describe("PATCH /change-password", () => {
    it("should change password with correct current password", async () => {
      const { token } = await createTestUser();

      const res = await request
        .patch("/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Test@1234",
          newPassword: "NewP@ss1234",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject wrong current password", async () => {
      const { token } = await createTestUser();

      const res = await request
        .patch("/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "WrongP@ss1",
          newPassword: "NewP@ss1234",
        });

      expect(res.status).toBe(401);
    });
  });
});
