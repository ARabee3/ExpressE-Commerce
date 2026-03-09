import Joi from "joi";

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Must be a valid MongoDB ObjectId.",
  });

/**
 * POST /chatbot/chat
 */
export const sendMessageValidation = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required().messages({
    "string.empty": "Message cannot be empty.",
    "string.max": "Message must be 2000 characters or fewer.",
    "any.required": "Message is required.",
  }),
  conversationId: objectId.optional().allow(null, "").messages({
    "string.pattern.base": "Conversation ID must be a valid ID.",
  }),
});

/**
 * GET /chatbot/conversations/:id
 * DELETE /chatbot/conversations/:id
 */
export const conversationIdValidation = Joi.object({
  id: objectId.required().messages({
    "any.required": "Conversation ID is required.",
  }),
});

/**
 * GET /chatbot/conversations  (query params)
 */
export const listConversationsValidation = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number.",
    "number.min": "Page must be at least 1.",
  }),
  limit: Joi.number().integer().min(1).max(50).default(20).messages({
    "number.base": "Limit must be a number.",
    "number.min": "Limit must be at least 1.",
    "number.max": "Limit must be 50 or fewer.",
  }),
});
