import { GoogleGenAI } from "@google/genai";
import { productModel } from "../../Database/Models/product.model.js";
import { orderModel } from "../../Database/Models/order.model.js";
import { categoryModel } from "../../Database/Models/category.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";


console.log("Gemini API Key Loaded:", !!process.env.GEMINI_API_KEY);
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


const tools = [
  {
    functionDeclarations: [
      {
        name: "search_products",
        description: "Search for products in the store based on a keyword, category, min price, or max price.",
        parameters: {
          type: "OBJECT",
          properties: {
            keyword: { type: "STRING", description: "Product name keyword" },
            category: { type: "STRING", description: "Category name" },
            minPrice: { type: "NUMBER" },
            maxPrice: { type: "NUMBER" },
          },
        },
      },
      {
        name: "track_order",
        description: "Track a specific order by its ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: { type: "STRING", description: "The unique ID of the order." },
          },
          required: ["orderId"],
        },
      },
      {
        name: "get_my_orders",
        description: "Get the order history for the currently authenticated user.",
        parameters: { type: "OBJECT", properties: {} },
      },
    ],
  },
];

export const handleChat = catchAsync(async (req, res, next) => {

  const { message, history } = req.body;
  const userId = req.user._id;
  console.log("Received message:", message);

  if (!message) return next(new AppError("Message is required", 400));

  // format history 
  const contents = (history || []).map(item => ({
    role: item.role === "assistant" || item.role === "model" ? "model" : "user",
    parts: [{ text: String(item.text || item.content) }],
  }));

  contents.push({ role: "user", parts: [{ text: message }] });

  //  initial Call
  let response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      systemInstruction:
        "You are a helpful E-Commerce assistant. Use tools to fetch real data.",
      tools: tools,
    },
  });
  // console.log("initial response received. ");

 
 //loop on the model's response to check if it wants to call any tool,
  while (response.candidates[0].content.parts.some(part => part.functionCall)) {
    const activeContent = response.candidates[0].content;
    contents.push(activeContent); 
    const toolParts = [];

    for (const part of activeContent.parts) {
      if (part.functionCall) {
        const call = part.functionCall;
        let apiData = null;

        if (call.name === "search_products") {
          const { keyword, category, minPrice, maxPrice } = call.args;
          const query = {};
          if (keyword) query.name = { $regex: keyword, $options: "i" };
          if (category) {
            const cat = await categoryModel.findOne({ name: { $regex: category, $options: "i" } });
            if (cat) query.category = cat._id;
          }
          if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = minPrice;
            if (maxPrice) query.price.$lte = maxPrice;
          }
          apiData = await productModel.find(query).limit(4).select("name price stock").lean();
        } 
        
        else if (call.name === "track_order") {
          try {
            apiData = await orderModel.findOne({ _id: call.args.orderId, userId }).lean();
          } catch (e) { apiData = { error: "Invalid Order ID" }; }
        } 
        
        else if (call.name === "get_my_orders") {
          apiData = await orderModel.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();
        }

        toolParts.push({
          functionResponse: {
            name: call.name,
            response: { content: apiData },
          },
        });
      }
    }

    contents.push({ role: "tool", parts: toolParts });

    // Re-call to let Gemini process the data
    response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: { tools: tools },
    });
  }

  res.status(200).json({
    status: "success",
    response: response.text(),
  });
});