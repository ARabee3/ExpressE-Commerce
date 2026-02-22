import { describe, it, expect, beforeAll } from "vitest";
import {
  request,
  createTestUser,
  createTestSeller,
  createTestCategory,
  createTestProduct,
} from "./helpers.js";

describe("Cart", () => {
  let userToken;
  let productId;

  beforeAll(async () => {
    const customer = await createTestUser();
    userToken = customer.token;

    const seller = await createTestSeller();
    const category = await createTestCategory();
    const product = await createTestProduct(
      seller.user._id,
      category._id,
      { stock: 100 },
    );
    productId = product._id.toString();
  });

  // ── Add to Cart ─────────────────────────────────────
  describe("POST /cart", () => {
    it("should add item to authenticated user cart", async () => {
      const res = await request
        .post("/cart")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ productId, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it("should add item as guest (returns sessionId)", async () => {
      const res = await request.post("/cart").send({
        productId,
        quantity: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBeDefined();
    });

    it("should reject adding more than available stock", async () => {
      const res = await request
        .post("/cart")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ productId, quantity: 99999 });

      expect(res.status).toBe(400);
    });
  });

  // ── Get Cart ────────────────────────────────────────
  describe("GET /cart", () => {
    it("should return user cart", async () => {
      const res = await request
        .get("/cart")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("items");
      expect(res.body.data).toHaveProperty("totalPrice");
    });

    it("should handle guest cart with session id", async () => {
      const sessionId = `guest_test_${Date.now()}`;
      // Add an item first to create a guest cart
      const addRes = await request.post("/cart").send({
        productId,
        quantity: 1,
        sessionId,
      });

      expect(addRes.status).toBe(200);
      expect(addRes.body.sessionId).toBe(sessionId);
    });
  });

  // ── Update Quantity ─────────────────────────────────
  describe("PATCH /cart/items/:itemId", () => {
    it("should update item quantity", async () => {
      // Get cart to find itemId
      const cartRes = await request
        .get("/cart")
        .set("Authorization", `Bearer ${userToken}`);

      const itemId = cartRes.body.data.items[0]._id;

      const res = await request
        .patch(`/cart/items/${itemId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(200);
    });
  });

  // ── Remove from Cart ────────────────────────────────
  describe("DELETE /cart/items/:productId", () => {
    it("should soft-delete item from cart", async () => {
      const res = await request
        .delete(`/cart/items/${productId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });
  });
});
