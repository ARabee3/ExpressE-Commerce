import { describe, it, expect, beforeAll } from "vitest";
import { request, createTestSeller, createTestUser, createTestCategory } from "./helpers.js";

describe("Products", () => {
  let sellerToken;
  let sellerId;
  let customerToken;
  let categoryId;
  let createdProductId;

  beforeAll(async () => {
    const seller = await createTestSeller();
    sellerToken = seller.token;
    sellerId = seller.user._id.toString();

    const customer = await createTestUser();
    customerToken = customer.token;

    const category = await createTestCategory();
    categoryId = category._id.toString();
  });

  // ── Create ──────────────────────────────────────────
  describe("POST /products", () => {
    it("should create product as approved seller", async () => {
      const res = await request
        .post("/products")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          name: "Test Headphones",
          description: "Wireless Bluetooth headphones",
          price: 49.99,
          stock: 100,
          images: ["https://example.com/headphones.jpg"],
          category: categoryId,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data.name).toBe("Test Headphones");
      createdProductId = res.body.data._id;
    });

    it("should reject product creation by customer", async () => {
      const res = await request
        .post("/products")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          name: "Rejected Product",
          description: "Should fail",
          price: 10,
          stock: 5,
          images: ["https://example.com/img.jpg"],
          category: categoryId,
        });

      expect(res.status).toBe(403);
    });

    it("should reject product without required fields", async () => {
      const res = await request
        .post("/products")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({ name: "Incomplete" });

      expect(res.status).toBe(422);
    });
  });

  // ── Read ────────────────────────────────────────────
  describe("GET /products", () => {
    it("should list products with pagination (public)", async () => {
      const res = await request.get("/products");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalProducts");
      expect(res.body).toHaveProperty("totalPages");
      expect(res.body).toHaveProperty("currentPage");
      expect(Array.isArray(res.body.products)).toBe(true);
    });

    it("should filter by keyword", async () => {
      // Skip if product creation failed
      if (!createdProductId) return;

      const res = await request.get("/products?keyword=Headphones");

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThanOrEqual(1);
    });

    it("should paginate correctly", async () => {
      const res = await request.get("/products?page=1&limit=1");

      expect(res.status).toBe(200);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.products.length).toBeLessThanOrEqual(1);
    });
  });

  // ── Update ──────────────────────────────────────────
  describe("PUT /products/:id", () => {
    it("should update product as seller", async () => {
      if (!createdProductId) return;

      const res = await request
        .put(`/products/${createdProductId}`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          price: 39.99,
          name: "Updated Headphones",
          description: "Updated wireless Bluetooth headphones",
          images: ["https://example.com/headphones.jpg"],
          category: categoryId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(39.99);
    });
  });

  // ── Delete ──────────────────────────────────────────
  describe("DELETE /products/:id", () => {
    it("should delete product as seller", async () => {
      if (!createdProductId) return;

      const res = await request
        .delete(`/products/${createdProductId}`)
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
    });
  });
});
