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
 * DELETE /chatbot/conversations/:id
 * Soft-delete a conversation.
 */
export const deleteConversation = catchAsync(async (req, res) => {
  const userId = req.user._id;
  await chatbotService.deleteConversation(userId, req.params.id);

  res.status(200).json({ status: "success", message: "Conversation deleted." });
});
