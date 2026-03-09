import express from "express";
import {
  handleChat,
  getConversations,
  getConversation,
  deleteConversation,
} from "./chatbot.controller.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";
import { validate } from "../../Middlewares/validate.js";
import { chatbotLimiter } from "../../Middlewares/rateLimiter.js";
import {
  sendMessageValidation,
  conversationIdValidation,
  listConversationsValidation,
} from "../../Validations/chatbotValidation.js";

const chatbotRoutes = express.Router();

// All chatbot routes require authentication
chatbotRoutes.use("/chatbot", verifyToken);

// Send a message (with chatbot-specific rate limiter)
chatbotRoutes.post(
  "/chatbot/chat",
  chatbotLimiter,
  validate(sendMessageValidation),
  handleChat,
);

// Conversation management
chatbotRoutes.get(
  "/chatbot/conversations",
  validate(listConversationsValidation),
  getConversations,
);

chatbotRoutes.get(
  "/chatbot/conversations/:id",
  validate(conversationIdValidation),
  getConversation,
);

chatbotRoutes.delete(
  "/chatbot/conversations/:id",
  validate(conversationIdValidation),
  deleteConversation,
);

export default chatbotRoutes;
