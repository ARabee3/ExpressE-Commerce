import { describe, it, expect, beforeAll } from "vitest";
import {
  request,
  createTestUser,
  createTestSeller,
  createTestCategory,
  createTestProduct,
  createTestCart,
} from "./helpers.js";
import { productModel } from "../Database/Models/product.model.js";

describe("Orders", () => {
  let userToken;
  let userId;
  let cartId;
  let productId;
  let orderId;
  let initialStock;

  beforeAll(async () => {
    const customer = await createTestUser();
    userToken = customer.token;
    userId = customer.user._id;

    const seller = await createTestSeller();
    const category = await createTestCategory();
    const product = await createTestProduct(
      seller.user._id,
      category._id,
      { stock: 50 },
    );
    productId = product._id.toString();
    initialStock = product.stock;

    const cart = await createTestCart(userId, product._id, 3);
    cartId = cart._id.toString();
  });

  // ── Place Order ─────────────────────────────────────
  describe("POST /orders", () => {
    it("should place an order from cart", async () => {
      const res = await request
        .post("/orders")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          cartId,
          shippingAddress: {
            street: "123 Test St",
            city: "Cairo",
            state: "Cairo Governorate",
          },
          paymentMethod: "Cash",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data.orderItems.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.status).toBe("Pending");
      orderId = res.body.data._id;

      // Verify stock was decremented atomically
      const updatedProduct = await productModel.findById(productId);
      expect(updatedProduct.stock).toBe(initialStock - 3);
    });
  });

  // ── Get Orders ──────────────────────────────────────
  describe("GET /orders", () => {
    it("should return paginated user orders", async () => {
      const res = await request
        .get("/orders")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalOrders");
      expect(res.body).toHaveProperty("currentPage");
      expect(res.body).toHaveProperty("totalPages");
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── Get Order by ID ─────────────────────────────────
  describe("GET /orders/:id", () => {
    it("should return order for the owner", async () => {
      const res = await request
        .get(`/orders/${orderId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(orderId);
    });

    it("should reject access for non-owner", async () => {
      const otherUser = await createTestUser();

      const res = await request
        .get(`/orders/${orderId}`)
        .set("Authorization", `Bearer ${otherUser.token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Track Order ─────────────────────────────────────
  describe("GET /orders/:id/track", () => {
    it("should return order tracking info", async () => {
      const res = await request
        .get(`/orders/${orderId}/track`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("status");
    });
  });

  // ── Cancel Order ────────────────────────────────────
  describe("PUT /orders/:id/cancel", () => {
    it("should cancel a pending unpaid order and restore stock", async () => {
      const res = await request
        .put(`/orders/${orderId}/cancel`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("Cancelled");

      // Verify stock was restored
      const restoredProduct = await productModel.findById(productId);
      expect(restoredProduct.stock).toBe(initialStock);
    });

    it("should not cancel an already cancelled order", async () => {
      const res = await request
        .put(`/orders/${orderId}/cancel`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });
  });
});
