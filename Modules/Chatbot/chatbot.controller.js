import { OpenAI } from "openai";
import { productModel } from "../../Database/Models/product.model.js";
import { orderModel } from "../../Database/Models/order.model.js";
import { categoryModel } from "../../Database/Models/category.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";

// Initialize OpenAI
// Ensure you have OPENAI_API_KEY in your .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "fallback_key",
});

const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search for products in the store based on a keyword, category, min price, or max price. Call this whenever a user asks to find, buy, or see products.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "A keyword from the product name to search for. e.g., 'laptop', 'camera', 'T-shirt'.",
          },
          category: {
            type: "string",
            description: "The name of a category to filter by, e.g., 'electronics', 'fashion'.",
          },
          minPrice: {
            type: "number",
            description: "The minimum price filter if specified by the user.",
          },
          maxPrice: {
            type: "number",
            description: "The maximum price filter if specified by the user.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "track_order",
      description: "Track a specific order by its ID for the currently authenticated user. Call this when the user asks to track a specific order and provides the order ID.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The unique ID of the order to track.",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_orders",
      description: "Get the order history for the currently authenticated user. Call this when the user asks to see their past orders, order history, or list their orders.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const handleChat = catchAsync(async (req, res, next) => {
  const { message, history } = req.body;
  const userId = req.user._id;

  console.log(message, history, userId);
  if (!message) {
    return next(new AppError("Message is required", 400));
  }

  // Format incoming history for OpenAI
  // Ensure the history objects have {"role": "user" | "assistant", "content": "..."}
  const formattedHistory = (history || []).map(item => {
    return {
      role: item.role === "model" ? "assistant" : item.role, 
      content: item.text || item.content
    };
  });

  const messages = [
    {
      role: "system",
      content: "You are a helpful E-Commerce assistant for the Express E-Commerce project. Answer nicely. Whenever a user asks for products or orders, ALWAYS use the relevant functions to fetch real data before answering.",
    },
    ...formattedHistory,
    { role: "user", content: message },
  ];

  // Send request to OpenAI
  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Very fast, cheap, and supports robust function calling
    messages: messages,
    tools: tools,
    tool_choice: "auto",
  });

  let responseMessage = response.choices[0].message;

  // Check if OpenAI wanted to call a function. Use a while loop because it might request multiple tool calls in a row!
  while (responseMessage.tool_calls) {
    messages.push(responseMessage); // append the assistant's tool call message

    // Iterate through all the tool calls
    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (err) {
        console.error("Failed to parse tool arguments:", toolCall.function.arguments);
      }

      let apiResponse = null;

      // ------------- 1- search_products -------------
      if (functionName === "search_products") {
        const { keyword, category, minPrice, maxPrice } = args;
        const filter = {};

        if (keyword) filter.name = { $regex: keyword, $options: "i" };
        
        if (category) {
          const foundCategory = await categoryModel.findOne({
            name: { $regex: category, $options: "i" },
          });
          if (foundCategory) {
            filter.category = foundCategory._id;
          }
        }

        if (minPrice || maxPrice) {
          filter.price = {};
          if (minPrice) filter.price.$gte = Number(minPrice);
          if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const products = await productModel
          .find(filter)
          .limit(5)
          .select("name price description stock")
          .lean();

        apiResponse = products.length ? products : "No products found matching the criteria.";
      }

      // ------------- 2- track_order -------------
      else if (functionName === "track_order") {
        const { orderId } = args;

        if (!orderId) {
          apiResponse = { success: false, message: "Please provide an order ID to track." };
        } else {
          try {
            const order = await orderModel
              .findOne({ _id: orderId, userId })
              .populate("orderItems.productId", "name price")
              .select("status finalPrice createdAt paymentMethod isPaid orderItems processedAt shippedAt deliveredAt cancelledAt")
              .lean();

            apiResponse = order ? order : "No order found with the provided ID for this user.";
          } catch (error) {
            apiResponse = { success: false, message: "Invalid order ID format." };
          }
        }
      }

      // ------------- 3- get_my_orders -------------
      else if (functionName === "get_my_orders") {
        const orders = await orderModel
          .find({ userId })
          .sort({ createdAt: -1 })
          .populate("orderItems.productId", "name price")
          .select("status finalPrice createdAt paymentMethod isPaid orderItems shippingAddress")
          .lean();

        apiResponse = orders.length ? orders : "No orders found for this user.";
      }

      // Append the actual function response to messages so the LLM can read it
      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: functionName,
        content: JSON.stringify(apiResponse), 
      });
    }

    // Call OpenAI again with the injected function responses
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      tools: tools,
    });
    
    // Update responseMessage for the next iteration of the while loop
    responseMessage = response.choices[0].message;
  }

  // Return final response from OpenAI
  res.status(200).json({
    status: "success",
    response: responseMessage.content,
  });
});
