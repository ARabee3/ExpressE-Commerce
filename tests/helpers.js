import supertest from "supertest";
import { createApp } from "../createApp.js";
import { userModel } from "../Database/Models/user.model.js";
import { productModel } from "../Database/Models/product.model.js";
import { categoryModel } from "../Database/Models/category.model.js";
import { cartModel } from "../Database/Models/cart.model.js";

const app = createApp();

/**
 * Create a user and return { user, token }.
 * If verify=true, the user is pre-verified so they can login.
 */
export const createTestUser = async (overrides = {}, verify = true) => {
  const defaults = {
    name: "Test User",
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`,
    password: "Test@1234",
    phone: "+201012345678",
    role: "Customer",
  };
  const data = { ...defaults, ...overrides };

  const user = await userModel.create({
    ...data,
    isVerified: verify,
  });

  const token = user.generateToken();

  return { user, token, password: data.password };
};

/**
 * Create a verified seller with isApproved=true.
 */
export const createTestSeller = async () => {
  const { user, token } = await createTestUser(
    { role: "Seller", storeName: "Test Store", isApproved: true, isActive: true },
    true,
  );
  // Ensure seller flags are set
  user.isApproved = true;
  user.isActive = true;
  await user.save({ validateModifiedOnly: true });

  // Re-generate token with updated role data
  const sellerToken = user.generateToken();
  return { user, token: sellerToken };
};

/**
 * Create a test category.
 */
export const createTestCategory = async () => {
  const category = await categoryModel.create({
    name: `Category_${Date.now()}`,
  });
  return category;
};

/**
 * Create a test product (requires a seller and category).
 */
export const createTestProduct = async (sellerId, categoryId, overrides = {}) => {
  const defaults = {
    sellerId,
    name: `Product_${Date.now()}`,
    description: "Test product description",
    price: 29.99,
    stock: 50,
    images: ["https://example.com/image.jpg"],
    category: categoryId,
  };
  const product = await productModel.create({ ...defaults, ...overrides });
  return product;
};

/**
 * Create a cart with items for a user.
 */
export const createTestCart = async (userId, productId, quantity = 2) => {
  const cart = await cartModel.create({
    userId,
    items: [{ productId, quantity }],
    totalPrice: 0,
    finalPrice: 0,
  });
  // Recalculate prices
  await cart.populate("items.productId");
  const product = cart.items[0].productId;
  cart.totalPrice = product.price * quantity;
  cart.finalPrice = cart.totalPrice;
  await cart.save();
  return cart;
};

export const request = supertest(app);
export { app };
