import { catchAsync } from "../../Utils/Error/catchAsync.js";
import * as chatbotService from "./chatbot.service.js";

/**
 * POST /chatbot/chat
 * Send a message (optionally within an existing conversation).
 */
export const handleChat = catchAsync(async (req, res) => {
  const { message, conversationId } = req.body;
  const userId = req.user._id;

  const result = await chatbotService.sendMessage({
    userId,
    conversationId: conversationId || undefined,
    message,
  });

  res.status(200).json({
    status: "success",
    data: result,
  });
});

/**
 * GET /chatbot/conversations
 * List the authenticated user's conversations.
 */
export const getConversations = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { page, limit } = req.query;

  const data = await chatbotService.listConversations(userId, {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });

  res.status(200).json({ status: "success", data });
});

/**
 * GET /chatbot/conversations/:id
 * Get a single conversation with all messages.
 */
export const getConversation = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const data = await chatbotService.getConversation(userId, req.params.id);

  res.status(200).json({ status: "success", data });
});

/**
 * POST /chatbot/chat/stream
 * Stream a chatbot response via Server-Sent Events (SSE).
 *
 * Events emitted:
 *   meta  – { conversationId, context, suggestions }  (first)
 *   delta – { text }                                   (N times)
 *   done  – { tokenUsage }                             (last)
 *   error – { message }                                (on failure)
 */
export const handleChatStream = catchAsync(async (req, res) => {
  const { message, conversationId } = req.body;
  const userId = req.user._id;

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // disable Nginx buffering
  });

  try {
    await chatbotService.streamMessage(
      { userId, conversationId: conversationId || undefined, message },
      res,
    );
  } catch (err) {
    // If headers are already sent, push an error event instead of throwing
    if (res.headersSent) {
      const msg = err.message || "Streaming failed.";
      res.write(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`);
      res.end();
      return;
    }
    throw err; // let global error handler deal with it
  }
});

/**
 * DELETE /chatbot/conversations/:id
 * Soft-delete a conversation.
 */
export const deleteConversation = catchAsync(async (req, res) => {
  const userId = req.user._id;
  await chatbotService.deleteConversation(userId, req.params.id);

  res.status(200).json({ status: "success", message: "Conversation deleted." });
});
