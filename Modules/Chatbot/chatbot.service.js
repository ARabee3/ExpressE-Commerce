import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import sanitizeHtml from "sanitize-html";
import { conversationModel } from "../../Database/Models/conversation.model.js";
import { toolDeclarations, executeTool } from "./chatbot.tools.js";
import { SYSTEM_PROMPT, FALLBACK_RESPONSE } from "./chatbot.prompts.js";
import { AppError } from "../../Utils/Error/AppError.js";
import logger from "../../Utils/logger.js";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_TOOL_ITERATIONS = 5;
const MAX_CONTEXT_MESSAGES = 20; // sliding window
const MAX_CONVERSATIONS_PER_USER = 50;
const STALE_CONVERSATION_DAYS = 90; // auto-archive after 90 days of inactivity
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 30_000;

// ─── Gemini Safety Settings ─────────────────────────────────────────────────

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// ─── Response Sanitisation ──────────────────────────────────────────────────

/**
 * Strip dangerous HTML / scripts from the AI response text.
 * Allows basic markdown-compatible tags but nothing executable.
 */
const sanitizeResponse = (text) =>
  sanitizeHtml(text, {
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "ul",
      "ol",
      "li",
      "p",
      "br",
      "code",
      "pre",
    ],
    allowedAttributes: {},
    disallowedTagsMode: "recursiveEscape",
  });

/**
 * Strip ALL HTML / scripts from user input.
 * Plain text only — no tags allowed.
 */
const sanitizeInput = (text) =>
  sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

// ─── Suggested Prompts ──────────────────────────────────────────────────────

/**
 * Generate contextual follow-up suggestions based on which tools were used.
 */
const buildSuggestions = (toolsUsed) => {
  const suggestions = [];

  if (toolsUsed.includes("search_products")) {
    suggestions.push("Tell me more about the first product");
    suggestions.push("Show me cheaper options");
  }
  if (toolsUsed.includes("get_product_details")) {
    suggestions.push("What do other customers think of this product?");
    suggestions.push("Are there similar products?");
  }
  if (
    toolsUsed.includes("track_order") ||
    toolsUsed.includes("get_my_orders")
  ) {
    suggestions.push("When will my order be delivered?");
    suggestions.push("Show me my other orders");
  }
  if (toolsUsed.includes("get_categories")) {
    suggestions.push("Show me products in the first category");
  }
  if (toolsUsed.includes("get_cart")) {
    suggestions.push("What's my cart total?");
    suggestions.push("Remove the last item from my cart");
  }

  // Default suggestions when no tools were used (greeting, general question)
  if (suggestions.length === 0) {
    suggestions.push(
      "Search for a product",
      "Show my recent orders",
      "What categories do you have?",
      "View my cart",
    );
  }

  return suggestions.slice(0, 4); // max 4 suggestions
};

// ─── Gemini Client (singleton) ──────────────────────────────────────────────

let _client = null;

const getClient = () => {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new AppError("Gemini API key is not configured.", 503);
    }
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _client;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert stored messages into the Gemini `contents` format.
 * Applies a sliding window to keep token usage bounded.
 */
const buildContents = (messages) => {
  const sliced = messages.slice(-MAX_CONTEXT_MESSAGES);
  return sliced.map((msg) => ({
    role: msg.role === "model" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
};

/**
 * Call Gemini with an AbortController timeout.
 */
const callGemini = async (contents) => {
  const client = getClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: toolDeclarations,
        safetySettings: SAFETY_SETTINGS,
      },
      requestOptions: { signal: controller.signal },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Extract token counts from the response metadata (if available).
 */
const getTokenUsage = (response) => {
  const meta = response.usageMetadata || {};
  return {
    promptTokens: meta.promptTokenCount || 0,
    completionTokens: meta.candidatesTokenCount || 0,
    total: (meta.promptTokenCount || 0) + (meta.candidatesTokenCount || 0),
  };
};

// ─── Conversation Limits ────────────────────────────────────────────────────

/**
 * Enforce per-user conversation cap.
 * When the limit is reached, the oldest conversation is auto-archived.
 */
const enforceConversationLimit = async (userId) => {
  const count = await conversationModel.countDocuments({
    userId,
    isActive: true,
  });
  if (count >= MAX_CONVERSATIONS_PER_USER) {
    // Archive the oldest active conversation to make room
    const oldest = await conversationModel
      .findOne({ userId, isActive: true })
      .sort({ updatedAt: 1 })
      .select("_id");
    if (oldest) {
      await conversationModel.updateOne(
        { _id: oldest._id },
        { isActive: false },
      );
      logger.info(
        { userId, archivedConversationId: oldest._id },
        `Chatbot: auto-archived oldest conversation (limit: ${MAX_CONVERSATIONS_PER_USER})`,
      );
    }
  }
};

/**
 * Archive conversations that haven't been updated in STALE_CONVERSATION_DAYS.
 * Called opportunistically — not a cron job.
 */
const archiveStaleConversations = async (userId) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_CONVERSATION_DAYS);

  const result = await conversationModel.updateMany(
    { userId, isActive: true, updatedAt: { $lt: cutoff } },
    { isActive: false },
  );
  if (result.modifiedCount > 0) {
    logger.info(
      { userId, archived: result.modifiedCount },
      "Chatbot: auto-archived stale conversations",
    );
  }
};

// ─── Public Service Methods ─────────────────────────────────────────────────

/**
 * Send a message within an existing or new conversation.
 * Handles tool-calling loop, persists messages, and caps iterations.
 *
 * @param {Object} params
 * @param {string}  params.userId
 * @param {string}  [params.conversationId] - omit to create a new conversation
 * @param {string}  params.message
 * @returns {{ conversationId: string, response: string, tokenUsage: object }}
 */
export const sendMessage = async ({ userId, conversationId, message }) => {
  // Sanitize user input — strip all HTML tags
  const cleanMessage = sanitizeInput(message);

  // 1. Load or create conversation
  let conversation;
  if (conversationId) {
    conversation = await conversationModel.findOne({
      _id: conversationId,
      userId,
      isActive: true,
    });
    if (!conversation) {
      throw new AppError("Conversation not found.", 404);
    }
  } else {
    // Enforce limits before creating a new conversation
    await archiveStaleConversations(userId);
    await enforceConversationLimit(userId);
    conversation = new conversationModel({ userId, messages: [] });
  }

  // 2. Append user message
  conversation.messages.push({ role: "user", content: cleanMessage });

  // 3. Build Gemini context (sliding window)
  const contents = buildContents(conversation.messages);

  // 4. Call Gemini with tool loop
  let response;
  let toolsUsed = [];
  let totalTokens = 0;
  const context = {}; // structured data to return to the client

  try {
    response = await callGemini(contents);

    let iterations = 0;
    while (
      iterations < MAX_TOOL_ITERATIONS &&
      response.candidates?.[0]?.content?.parts?.some((p) => p.functionCall)
    ) {
      iterations++;
      const modelParts = response.candidates[0].content;
      contents.push(modelParts);

      // Execute every tool call in this turn
      const toolParts = [];
      for (const part of modelParts.parts) {
        if (part.functionCall) {
          toolsUsed.push(part.functionCall.name);
          const { geminiPart, contextEntry } = await executeTool(
            part.functionCall,
            userId,
          );
          toolParts.push(geminiPart);

          // Collect structured data for the client
          if (contextEntry) {
            if (!context[contextEntry.key]) context[contextEntry.key] = [];
            context[contextEntry.key].push(...contextEntry.data);
          }
        }
      }

      contents.push({ role: "tool", parts: toolParts });
      response = await callGemini(contents);
    }

    if (
      iterations >= MAX_TOOL_ITERATIONS &&
      response.candidates?.[0]?.content?.parts?.some((p) => p.functionCall)
    ) {
      logger.warn(
        { userId, conversationId: conversation._id },
        "Chatbot: max tool iterations reached",
      );
    }
  } catch (err) {
    if (err.name === "AbortError") {
      logger.error({ userId }, "Chatbot: Gemini request timed out");
      throw new AppError(
        "The AI service took too long to respond. Please try again.",
        504,
      );
    }
    // If it's already our AppError (like missing key), re-throw
    if (err instanceof AppError) throw err;

    logger.error({ err, userId }, "Chatbot: Gemini API error");
    throw new AppError(FALLBACK_RESPONSE, 502);
  }

  // 5. Extract response text & token usage
  const tokenUsage = getTokenUsage(response);
  totalTokens = tokenUsage.total;
  const rawText = response.text || FALLBACK_RESPONSE;
  const assistantText = sanitizeResponse(rawText);

  // 6. Persist assistant message
  conversation.messages.push({
    role: "model",
    content: assistantText,
    toolCalls: toolsUsed,
    tokenCount: totalTokens,
  });
  conversation.totalTokens += totalTokens;
  await conversation.save();

  logger.info(
    {
      userId,
      conversationId: conversation._id,
      tools: toolsUsed,
      tokens: totalTokens,
    },
    "Chatbot: message processed",
  );

  return {
    conversationId: conversation._id,
    response: assistantText,
    context, // structured data: { products: [...], orders: [...], categories: [...] }
    suggestions: buildSuggestions(toolsUsed),
    tokenUsage,
  };
};

/**
 * Stream a response via SSE (Server-Sent Events).
 * Handles tool calls synchronously before streaming the final text response.
 *
 * @param {Object}  params
 * @param {string}  params.userId
 * @param {string}  [params.conversationId]
 * @param {string}  params.message
 * @param {import('express').Response} res - Express response for SSE writes
 */
export const streamMessage = async (
  { userId, conversationId, message },
  res,
) => {
  // Sanitize user input — strip all HTML tags
  const cleanMessage = sanitizeInput(message);

  // 1. Load or create conversation
  let conversation;
  if (conversationId) {
    conversation = await conversationModel.findOne({
      _id: conversationId,
      userId,
      isActive: true,
    });
    if (!conversation) {
      throw new AppError("Conversation not found.", 404);
    }
  } else {
    await archiveStaleConversations(userId);
    await enforceConversationLimit(userId);
    conversation = new conversationModel({ userId, messages: [] });
  }

  conversation.messages.push({ role: "user", content: cleanMessage });

  const contents = buildContents(conversation.messages);
  const client = getClient();

  const context = {};
  const toolsUsed = [];

  // 2. Resolve tool calls first (non-streaming) — Gemini cannot stream + tool-call at once
  let toolIterations = 0;
  let pendingTools = true;

  while (pendingTools && toolIterations < MAX_TOOL_ITERATIONS) {
    const probeResponse = await callGemini(contents);
    const hasFunctionCalls =
      probeResponse.candidates?.[0]?.content?.parts?.some(
        (p) => p.functionCall,
      );

    if (!hasFunctionCalls) {
      pendingTools = false;
      break;
    }

    toolIterations++;
    const modelParts = probeResponse.candidates[0].content;
    contents.push(modelParts);

    const toolParts = [];
    for (const part of modelParts.parts) {
      if (part.functionCall) {
        toolsUsed.push(part.functionCall.name);
        const { geminiPart, contextEntry } = await executeTool(
          part.functionCall,
          userId,
        );
        toolParts.push(geminiPart);
        if (contextEntry) {
          if (!context[contextEntry.key]) context[contextEntry.key] = [];
          context[contextEntry.key].push(...contextEntry.data);
        }
      }
    }

    contents.push({ role: "tool", parts: toolParts });
  }

  // 3. Send structured data (context, suggestions) as the first SSE event
  const suggestions = buildSuggestions(toolsUsed);
  const sseMeta = { conversationId: conversation._id, context, suggestions };
  res.write(`event: meta\ndata: ${JSON.stringify(sseMeta)}\n\n`);

  // 4. Stream the final text response
  const streamResponse = await client.models.generateContentStream({
    model: MODEL_NAME,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      safetySettings: SAFETY_SETTINGS,
      // no tools — we already resolved them above
    },
  });

  let fullText = "";

  for await (const chunk of streamResponse) {
    const text = chunk.text;
    if (text) {
      const sanitized = sanitizeResponse(text);
      fullText += sanitized;
      res.write(
        `event: delta\ndata: ${JSON.stringify({ text: sanitized })}\n\n`,
      );
    }
  }

  // 5. Send final event with token usage
  const tokenUsage = getTokenUsage(streamResponse);
  res.write(`event: done\ndata: ${JSON.stringify({ tokenUsage })}\n\n`);
  res.end();

  // 6. Persist to DB
  const assistantText = fullText || FALLBACK_RESPONSE;
  conversation.messages.push({
    role: "model",
    content: assistantText,
    toolCalls: toolsUsed,
    tokenCount: tokenUsage.total,
  });
  conversation.totalTokens += tokenUsage.total;
  await conversation.save();

  logger.info(
    {
      userId,
      conversationId: conversation._id,
      tools: toolsUsed,
      tokens: tokenUsage.total,
    },
    "Chatbot: streamed message processed",
  );
};

/**
 * List conversations for a user (most recently updated first).
 */
export const listConversations = async (
  userId,
  { page = 1, limit = 20 } = {},
) => {
  const skip = (page - 1) * limit;
  const [conversations, total] = await Promise.all([
    conversationModel
      .find({ userId, isActive: true })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("title totalTokens createdAt updatedAt")
      .lean(),
    conversationModel.countDocuments({ userId, isActive: true }),
  ]);

  return { conversations, total, page, limit };
};

/**
 * Get a single conversation with its messages.
 */
export const getConversation = async (userId, conversationId) => {
  const conversation = await conversationModel
    .findOne({ _id: conversationId, userId, isActive: true })
    .lean();

  if (!conversation) throw new AppError("Conversation not found.", 404);
  return conversation;
};

/**
 * Soft-delete a conversation.
 */
export const deleteConversation = async (userId, conversationId) => {
  const result = await conversationModel.findOneAndUpdate(
    { _id: conversationId, userId, isActive: true },
    { isActive: false },
    { new: true },
  );
  if (!result) throw new AppError("Conversation not found.", 404);
};

/**
 * Lightweight health check — sends a tiny prompt to verify the API key
 * and model are reachable. Returns { status, model, latencyMs }.
 */
export const checkHealth = async () => {
  if (!process.env.GEMINI_API_KEY) {
    return { status: "unconfigured", model: MODEL_NAME, latencyMs: null };
  }

  const start = Date.now();
  try {
    const client = getClient();
    await client.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      config: { maxOutputTokens: 3 },
    });
    return {
      status: "connected",
      model: MODEL_NAME,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    logger.error({ err }, "Gemini health check failed");
    return {
      status: "disconnected",
      model: MODEL_NAME,
      latencyMs: Date.now() - start,
    };
  }
};
