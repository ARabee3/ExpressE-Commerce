import { productModel } from "../../Database/Models/product.model.js";
import { orderModel } from "../../Database/Models/order.model.js";
import { categoryModel } from "../../Database/Models/category.model.js";
import { cartModel } from "../../Database/Models/cart.model.js";
import { reviewModel } from "../../Database/Models/review.model.js";
import logger from "../../Utils/logger.js";

/**
 * Gemini function-calling tool declarations.
 * Each tool maps to a handler that queries the database and returns
 * a sanitized, safe-to-expose result.
 */
export const toolDeclarations = [
  {
    functionDeclarations: [
      {
        name: "search_products",
        description:
          "Search for products in the store by keyword, category name, price range, or rating. Returns up to 5 matching products.",
        parameters: {
          type: "OBJECT",
          properties: {
            keyword: {
              type: "STRING",
              description: "Product name or partial name to search for.",
            },
            category: {
              type: "STRING",
              description: "Category name to filter by.",
            },
            minPrice: {
              type: "NUMBER",
              description: "Minimum price filter.",
            },
            maxPrice: {
              type: "NUMBER",
              description: "Maximum price filter.",
            },
          },
        },
      },
      {
        name: "get_product_details",
        description: "Get full details for a single product by its ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            productId: {
              type: "STRING",
              description: "The MongoDB ObjectId of the product.",
            },
          },
          required: ["productId"],
        },
      },
      {
        name: "track_order",
        description:
          "Track a specific order by its ID. Only returns orders belonging to the authenticated user.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: {
              type: "STRING",
              description: "The unique ID of the order.",
            },
          },
          required: ["orderId"],
        },
      },
      {
        name: "get_my_orders",
        description:
          "Get the most recent orders (up to 5) for the authenticated user.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "get_categories",
        description: "List all available product categories.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "get_cart",
        description:
          "Get the current shopping cart for the authenticated user, including items, quantities, prices, and any applied coupon.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "get_product_reviews",
        description:
          "Get the most recent reviews (up to 5) for a specific product by its ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            productId: {
              type: "STRING",
              description: "The MongoDB ObjectId of the product.",
            },
          },
          required: ["productId"],
        },
      },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Escape user-supplied text before using it in a RegExp to prevent ReDoS.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── Tool Handlers ──────────────────────────────────────────────────────────

const handlers = {
  async search_products(args) {
    const { keyword, category, minPrice, maxPrice } = args;
    const query = {};

    if (keyword) {
      query.name = { $regex: escapeRegex(keyword), $options: "i" };
    }
    if (category) {
      const cat = await categoryModel.findOne({
        name: { $regex: escapeRegex(category), $options: "i" },
      });
      if (cat) query.category = cat._id;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = minPrice;
      if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }

    return productModel
      .find(query)
      .limit(5)
      .select("name price stock ratingsAverage images category")
      .populate("category", "name")
      .lean();
  },

  async get_product_details(args) {
    const product = await productModel
      .findById(args.productId)
      .select(
        "name price stock description ratingsAverage ratingsQuantity category images",
      )
      .populate("category", "name")
      .lean();

    if (!product) return { error: "Product not found." };
    return product;
  },

  async track_order(args, userId) {
    try {
      const order = await orderModel
        .findOne({ _id: args.orderId, userId })
        .select(
          "status orderItems totalOrderPrice finalPrice paymentMethod isPaid paidAt createdAt deliveredAt shippedAt",
        )
        .lean();

      if (!order)
        return { error: "Order not found or does not belong to you." };
      return order;
    } catch {
      return { error: "Invalid order ID format." };
    }
  },

  async get_my_orders(_args, userId) {
    return orderModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "status orderItems totalOrderPrice finalPrice paymentMethod isPaid createdAt",
      )
      .lean();
  },

  async get_categories() {
    return categoryModel.find().select("name slug").lean();
  },

  async get_cart(_args, userId) {
    const cart = await cartModel
      .findOne({ userId, isDeleted: false })
      .select("items totalPrice discountAmount finalPrice appliedCoupon")
      .populate({
        path: "items.productId",
        select: "name price images stock",
      })
      .populate("appliedCoupon", "code discount")
      .lean();

    if (!cart || cart.items.length === 0)
      return { message: "Your cart is empty." };

    return {
      items: cart.items
        .filter((i) => !i.isDeleted)
        .map((i) => ({
          product: i.productId,
          quantity: i.quantity,
        })),
      totalPrice: cart.totalPrice,
      discountAmount: cart.discountAmount,
      finalPrice: cart.finalPrice,
      coupon: cart.appliedCoupon || null,
    };
  },

  async get_product_reviews(args) {
    try {
      const reviews = await reviewModel
        .find({ product: args.productId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("review rating user createdAt")
        .populate("user", "name")
        .lean();

      if (!reviews.length)
        return { message: "No reviews found for this product." };
      return reviews;
    } catch {
      return { error: "Invalid product ID format." };
    }
  },
};

// ─── Dispatcher ─────────────────────────────────────────────────────────────

/**
 * Tools whose raw data should be forwarded to the client as structured context.
 * Maps tool name → the key used in the response `context` object.
 */
const CONTEXT_TOOLS = {
  search_products: "products",
  get_product_details: "products",
  track_order: "orders",
  get_my_orders: "orders",
  get_categories: "categories",
  get_cart: "cart",
  get_product_reviews: "reviews",
};

/**
 * Execute a single Gemini function call.
 * Returns { geminiPart, contextEntry } where:
 *   - geminiPart  → the functionResponse to feed back to Gemini
 *   - contextEntry → { key, data } for the client-facing structured context (or null)
 */
export const executeTool = async (functionCall, userId) => {
  const { name, args } = functionCall;
  const handler = handlers[name];

  if (!handler) {
    logger.warn({ tool: name }, "Chatbot: unknown tool requested by model");
    return {
      geminiPart: {
        functionResponse: {
          name,
          response: { content: { error: `Unknown tool: ${name}` } },
        },
      },
      contextEntry: null,
    };
  }

  try {
    const data = await handler(args || {}, userId);

    // Build client-facing context entry if this tool is in the allowlist
    let contextEntry = null;
    const contextKey = CONTEXT_TOOLS[name];
    if (contextKey && data && !data.error) {
      contextEntry = {
        key: contextKey,
        data: Array.isArray(data) ? data : [data],
      };
    }

    return {
      geminiPart: {
        functionResponse: {
          name,
          response: { content: data },
        },
      },
      contextEntry,
    };
  } catch (err) {
    logger.error({ err, tool: name }, "Chatbot: tool execution failed");
    return {
      geminiPart: {
        functionResponse: {
          name,
          response: {
            content: {
              error: "An internal error occurred while fetching data.",
            },
          },
        },
      },
      contextEntry: null,
    };
  }
};
