import { GoogleGenAI } from "@google/genai";
import { conversationModel } from "../../Database/Models/conversation.model.js";
import { toolDeclarations, executeTool } from "./chatbot.tools.js";
import { SYSTEM_PROMPT, FALLBACK_RESPONSE } from "./chatbot.prompts.js";
import { AppError } from "../../Utils/Error/AppError.js";
import logger from "../../Utils/logger.js";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_TOOL_ITERATIONS = 5;
const MAX_CONTEXT_MESSAGES = 20; // sliding window
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 30_000;

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
    conversation = new conversationModel({ userId, messages: [] });
  }

  // 2. Append user message
  conversation.messages.push({ role: "user", content: message });

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
  const assistantText = response.text || FALLBACK_RESPONSE;

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
    tokenUsage,
  };
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
