# Gemini AI Chatbot — Developer Documentation

> **Last Updated:** March 2026  
> **SDK:** `@google/genai` v1.44.0  
> **Model:** Configurable via `GEMINI_MODEL` env var (default: `gemini-2.5-flash`)

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Architecture](#architecture)
4. [File Structure](#file-structure)
5. [API Endpoints](#api-endpoints)
6. [Request / Response Examples](#request--response-examples)
7. [Conversation Model (MongoDB)](#conversation-model-mongodb)
8. [How Gemini Function Calling Works](#how-gemini-function-calling-works)
9. [Available Tools](#available-tools)
10. [System Prompt](#system-prompt)
11. [Rate Limiting](#rate-limiting)
12. [Validation Rules](#validation-rules)
13. [Safety & Security](#safety--security)
14. [Error Handling](#error-handling)
15. [Health Check](#health-check)
16. [How to Add a New Tool](#how-to-add-a-new-tool)
17. [Important Notes & Gotchas](#important-notes--gotchas)

---

## Overview

The chatbot module provides an AI-powered shopping assistant called **ShopBot**. It uses Google's Gemini API with **function calling** — the AI can query our actual database (products, orders, categories) in real-time and return results to the user.

**Key features:**

- Server-side conversation persistence (no client-side history tampering)
- Sliding context window (last 20 messages) to control token usage
- Structured `context` data returned alongside AI text (products, orders, categories, cart, reviews with real `_id`s for frontend linking)
- Contextual follow-up `suggestions` (max 4) returned with every response
- SSE streaming endpoint for real-time typewriter effect
- Response sanitization via `sanitize-html` (strips scripts/dangerous tags)
- Gemini safety settings (blocks harassment, hate speech, explicit content, dangerous content)
- Dedicated rate limiter (20 msgs / 15 min per user)
- 30-second timeout on Gemini calls
- Max 5 tool-calling iterations per request
- Token usage tracking per message and per conversation
- Max 50 active conversations per user (oldest auto-archived when limit reached)
- Auto-archiving of stale conversations (90 days of inactivity)

---

## Environment Variables

Add these to your `.env` file:

```env
# Required
GEMINI_API_KEY=your-google-ai-api-key

# Optional (defaults shown)
GEMINI_MODEL=gemini-2.5-flash
```

| Variable         | Required | Default            | Description                                                                                               |
| ---------------- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | **Yes**  | —                  | Google AI Studio API key. Get one at https://aistudio.google.com/apikey                                   |
| `GEMINI_MODEL`   | No       | `gemini-2.5-flash` | Which Gemini model to use. Options: `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-3.1-flash-lite`, etc. |

---

## Architecture

```
User Request
     │
     ▼
┌─────────────────┐
│  chatbot.routes  │  ← verifyToken → chatbotLimiter → validate
└────────┬────────┘
         ▼
┌─────────────────┐
│ chatbot.controller│  ← thin layer, just extracts req params
└────────┬────────┘
         ▼
┌─────────────────┐
│ chatbot.service  │  ← core logic: conversation CRUD, Gemini calls, tool loop
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────────┐
│ Gemini │ │ chatbot.tools │ ← DB queries (products, orders, categories)
│  API   │ └──────────────┘
└────────┘
         │
         ▼
┌─────────────────┐
│ Conversation DB  │  ← MongoDB persistence
└─────────────────┘
```

**Flow for each message:**

1. Controller receives request, passes to service
2. Service loads/creates a `Conversation` document
3. Appends user message, builds Gemini context (sliding window of last 20 messages)
4. Calls Gemini API with system prompt + tool declarations
5. If Gemini requests tool calls → executes them against our DB → feeds results back to Gemini
6. Repeats step 5 up to 5 times (max iterations)
7. Extracts final text response + token usage
8. Saves assistant message to conversation
9. Returns response + structured `context` data to client

---

## File Structure

```
Modules/Chatbot/
├── chatbot.controller.js   # Thin controller — 4 handlers
├── chatbot.service.js       # Core logic: Gemini calls, tool loop, conversation CRUD
├── chatbot.tools.js         # Tool declarations + DB handler functions
├── chatbot.prompts.js       # System prompt + fallback response
├── chatbot.routes.js        # Express routes with middleware chain

Database/Models/
├── conversation.model.js    # Mongoose schema for conversations

Validations/
├── chatbotValidation.js     # Joi schemas for all chatbot endpoints

Middlewares/
├── rateLimiter.js           # Contains chatbotLimiter (20 req/15 min/user)
```

---

## API Endpoints

All endpoints require authentication (`Authorization: Bearer <token>`).

| Method   | Endpoint                     | Description                           |  Rate Limited  |
| -------- | ---------------------------- | ------------------------------------- | :------------: |
| `POST`   | `/chatbot/chat`              | Send a message to ShopBot             | Yes (20/15min) |
| `POST`   | `/chatbot/chat/stream`       | Stream a response via SSE             | Yes (20/15min) |
| `GET`    | `/chatbot/conversations`     | List user's conversations (paginated) |       No       |
| `GET`    | `/chatbot/conversations/:id` | Get a conversation with all messages  |       No       |
| `DELETE` | `/chatbot/conversations/:id` | Soft-delete a conversation            |       No       |

---

## Request / Response Examples

### POST `/chatbot/chat` — Start a new conversation

**Request:**

```json
{
  "message": "Show me running shoes under $100"
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "conversationId": "665f1a2b3c4d5e6f7a8b9c0d",
    "response": "Here are some running shoes under $100:\n\n- **Nike Air Zoom** — $89.99 (15 in stock)\n- **Adidas Ultraboost** — $95.00 (8 in stock)",
    "context": {
      "products": [
        {
          "_id": "665a1b2c3d4e5f6a7b8c9d0e",
          "name": "Nike Air Zoom",
          "price": 89.99,
          "stock": 15,
          "ratingsAverage": 4.5,
          "images": ["uploads/products/shoe1.jpg"],
          "category": { "_id": "664a...", "name": "Shoes" }
        },
        {
          "_id": "665a1b2c3d4e5f6a7b8c9d0f",
          "name": "Adidas Ultraboost",
          "price": 95.0,
          "stock": 8,
          "ratingsAverage": 4.2,
          "images": ["uploads/products/shoe2.jpg"],
          "category": { "_id": "664a...", "name": "Shoes" }
        }
      ]
    },
    "suggestions": [
      "Tell me more about the first product",
      "Show me cheaper options",
      "What categories do you have?"
    ],
    "tokenUsage": {
      "promptTokens": 250,
      "completionTokens": 120,
      "total": 370
    }
  }
}
```

### POST `/chatbot/chat` — Continue a conversation

**Request:**

```json
{
  "message": "Tell me more about the Nike ones",
  "conversationId": "665f1a2b3c4d5e6f7a8b9c0d"
}
```

### GET `/chatbot/conversations?page=1&limit=10`

**Response:**

```json
{
  "status": "success",
  "data": {
    "conversations": [
      {
        "_id": "665f1a2b3c4d5e6f7a8b9c0d",
        "title": "Show me running shoes under $100",
        "totalTokens": 1250,
        "createdAt": "2026-03-09T10:30:00.000Z",
        "updatedAt": "2026-03-09T10:35:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### GET `/chatbot/conversations/:id`

Returns full conversation with all messages. Each message includes:

- `role`: `"user"` or `"model"`
- `content`: The message text
- `toolCalls`: Array of tool names used (e.g., `["search_products"]`)
- `tokenCount`: Tokens consumed by this message
- `createdAt`: Timestamp

### DELETE `/chatbot/conversations/:id`

**Response:**

```json
{
  "status": "success",
  "message": "Conversation deleted."
}
```

---

## SSE Streaming

`POST /chatbot/chat/stream` returns a real-time stream of text chunks using **Server-Sent Events**.

### Event Types

| Event   | Data                                       | When           |
| ------- | ------------------------------------------ | -------------- |
| `meta`  | `{ conversationId, context, suggestions }` | First event    |
| `delta` | `{ text }`                                 | For each chunk |
| `done`  | `{ tokenUsage }`                           | Last event     |
| `error` | `{ message }`                              | On failure     |

### Client Example (JavaScript)

```javascript
const response = await fetch("/chatbot/chat/stream", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ message: "Show me laptops under $500" }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  // Parse SSE events from text
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      const data = JSON.parse(line.slice(6));
      // Handle based on event type
    }
  }
}
```

### Angular Example (using EventSource or fetch)

```typescript
this.http
  .post(
    "/chatbot/chat/stream",
    { message },
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "text",
      observe: "events",
      reportProgress: true,
    },
  )
  .subscribe((event) => {
    // Handle SSE events
  });
```

### How it works internally

1. Tool calls are resolved **synchronously first** (non-streaming) since Gemini cannot stream while tool-calling.
2. A `meta` event is sent with `conversationId`, `context` (structured data), and `suggestions`.
3. The final text generation is streamed via `generateContentStream` — each chunk is sanitized and sent as a `delta` event.
4. A `done` event is sent with token usage, and the connection closes.
5. The conversation is persisted to MongoDB after the stream completes.

---

## Suggested Prompts

Every response (both regular and streaming) includes a `suggestions` array with up to 4 contextual follow-up prompts.

### How suggestions work

Suggestions are generated based on **which tools were used** in the response:

| Tools used                            | Example suggestions                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `search_products`                     | "Tell me more about the first product", "Show me cheaper options"                               |
| `get_product_details`                 | "What do other customers think of this product?", "Are there similar products?"                 |
| `track_order` / `get_my_orders`       | "When will my order be delivered?", "Show me my other orders"                                   |
| `get_categories`                      | "Show me products in the first category"                                                        |
| `get_cart`                            | "What's my cart total?", "Remove the last item from my cart"                                    |
| No tools (greeting, general question) | "Search for a product", "Show my recent orders", "What categories do you have?", "View my cart" |

### Frontend usage

Render the suggestions as clickable buttons/chips below the AI response. When clicked, send the suggestion text as the next message with the same `conversationId`.

---

## Conversation Model (MongoDB)

**Collection:** `conversations`

```javascript
{
  userId:      ObjectId,       // ref: "User", required, indexed
  title:       String,         // auto-generated from first message (max 80 chars)
  messages: [
    {
      role:       "user" | "model",
      content:    String,       // max 10,000 chars
      toolCalls:  [String],     // e.g. ["search_products", "get_product_details"]
      tokenCount: Number,
      createdAt:  Date,
      updatedAt:  Date
    }
  ],
  totalTokens: Number,          // cumulative token count
  isActive:    Boolean,         // false = soft-deleted
  createdAt:   Date,
  updatedAt:   Date
}
```

**Limits:**

- Max 50 active conversations per user (oldest auto-archived when exceeded)
- Max 100 messages per conversation (enforced by Mongoose validator)
- Max 10,000 chars per individual message content
- Conversations inactive for 90 days are auto-archived on next request
- Title auto-generated from first user message (first 80 chars)

**Indexes:**

- `{ userId: 1, updatedAt: -1 }` — for listing conversations sorted by recent activity

---

## How Gemini Function Calling Works

This is the core concept. Here's how it works step-by-step:

1. We send the user's message to Gemini along with **tool declarations** (descriptions of what our tools do).
2. Gemini reads the message and decides: "I need to call `search_products` with `{ keyword: 'shoes', maxPrice: 100 }`"
3. We receive the function call, execute it against our MongoDB, and send the results back to Gemini.
4. Gemini now has real data and generates a natural language response.
5. Steps 2-4 can repeat up to **5 times** per request (e.g., if the AI needs to search products AND then get details for one of them).

```
User: "Show me cheap laptops"
        │
        ▼
Gemini: "I need to call search_products({ keyword: 'laptop', maxPrice: 500 })"
        │
        ▼
Our DB: Returns 3 laptops with _id, name, price, stock, images
        │
        ▼
Gemini: "Here are 3 laptops under $500: ..."  ← final text response
```

The tool results are also returned to the **frontend** as structured `context` data, so the UI can render clickable product cards, order tracking, etc.

---

## Available Tools

These are declared in `chatbot.tools.js`. Gemini decides when to call them.

| Tool Name             | Description                                       | Parameters                                        | Returns                                                                                         |
| --------------------- | ------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `search_products`     | Search products by keyword, category, price range | `keyword?`, `category?`, `minPrice?`, `maxPrice?` | Up to 5 products with `_id`, `name`, `price`, `stock`, `ratingsAverage`, `images`, `category`   |
| `get_product_details` | Get full details for one product                  | `productId` (required)                            | Single product with `description`, `ratingsQuantity`, etc.                                      |
| `track_order`         | Track a specific order (owner only)               | `orderId` (required)                              | Order with `status`, `orderItems`, `totalOrderPrice`, `finalPrice`, `paymentMethod`, timestamps |
| `get_my_orders`       | Get user's 5 most recent orders                   | (none)                                            | Array of orders (same fields as track_order)                                                    |
| `get_categories`      | List all categories                               | (none)                                            | Array of `{ name, slug }`                                                                       |
| `get_cart`            | View the authenticated user's cart                | (none)                                            | Cart items with product details, quantities, prices, applied coupon                             |
| `get_product_reviews` | Get latest 5 reviews for a product                | `productId` (required)                            | Array of reviews with `review`, `rating`, `user.name`, `createdAt`                              |

### Context Mapping

Tool results are forwarded to the client in the `context` object:

| Tool                  | → `context` key      |
| --------------------- | -------------------- |
| `search_products`     | `context.products`   |
| `get_product_details` | `context.products`   |
| `track_order`         | `context.orders`     |
| `get_my_orders`       | `context.orders`     |
| `get_categories`      | `context.categories` |
| `get_cart`            | `context.cart`       |
| `get_product_reviews` | `context.reviews`    |

If no tools are called (e.g., greeting or general question), `context` will be `{}`.

---

## System Prompt

Defined in `chatbot.prompts.js`. This is what shapes the AI's behavior:

- **Identity:** "ShopBot" — friendly, professional shopping assistant
- **Rules:**
  - Must use tools for real data — never fabricate
  - Stays on-topic (e-commerce only)
  - Resists prompt injection attempts
  - Never shares PII (passwords, addresses, card numbers)
  - Concise responses with bullet points
  - Formats currency consistently ($29.99)
- **Fallback:** If Gemini is unavailable, returns: _"I'm sorry, I'm having trouble processing your request right now."_

---

## Rate Limiting

| Limiter          | Window     | Max Requests | Key     | Prefix        |
| ---------------- | ---------- | :----------: | ------- | ------------- |
| `chatbotLimiter` | 15 minutes |      20      | User ID | `rl-chatbot:` |

Stored in Redis. Defined in `Middlewares/rateLimiter.js` alongside the global and auth limiters.

When exceeded, returns:

```json
{
  "message": "You've sent too many messages. Please wait a few minutes before trying again."
}
```

---

## Validation Rules

Defined in `Validations/chatbotValidation.js` using Joi:

### `POST /chatbot/chat`

| Field            | Type   | Required | Rules                                 |
| ---------------- | ------ | :------: | ------------------------------------- |
| `message`        | string |   Yes    | 1–2000 chars, trimmed                 |
| `conversationId` | string |    No    | Valid MongoDB ObjectId (24 hex chars) |

### `GET /chatbot/conversations`

| Query Param | Type   | Default | Rules        |
| ----------- | ------ | :-----: | ------------ |
| `page`      | number |    1    | Integer ≥ 1  |
| `limit`     | number |   20    | Integer 1–50 |

### `GET/DELETE /chatbot/conversations/:id`

| Param | Type   | Required | Rules                  |
| ----- | ------ | :------: | ---------------------- |
| `id`  | string |   Yes    | Valid MongoDB ObjectId |

---

## Safety & Security

| Protection              | How                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Auth required**       | All routes go through `verifyToken` middleware                                                  |
| **Rate limiting**       | 20 messages/15min per user (Redis-backed)                                                       |
| **Input validation**    | Joi schema: 2000 char max, ObjectId format check                                                |
| **Output sanitization** | All AI responses passed through `sanitize-html` — strips `<script>`, `<iframe>`, event handlers |
| **Safety settings**     | Gemini blocks MEDIUM and above for harassment, hate speech, explicit content, dangerous content |
| **ReDoS prevention**    | All user-supplied keywords are escaped before `$regex` via `escapeRegex()`                      |
| **NoSQL injection**     | Global `sanitizeNoSQL` middleware + controlled query building                                   |
| **PII protection**      | Order queries use `.select()` to exclude addresses/payment data                                 |
| **User isolation**      | Orders/conversations always filtered by `userId` — users cannot see each other's data           |
| **Prompt injection**    | System prompt instructs model to reject role-change attempts                                    |
| **Tool loop cap**       | Max 5 iterations prevents infinite loops / runaway costs                                        |
| **Timeout**             | 30-second AbortController timeout on all Gemini calls                                           |
| **Token tracking**      | Every message logs token count; total tracked per conversation                                  |
| **Soft delete**         | Conversations are soft-deleted (set `isActive: false`), not actually removed                    |

---

## Error Handling

All errors follow the standard `AppError` + `catchAsync` pattern (no try/catch in controllers).

| Status | When                                                  | Message                             |
| ------ | ----------------------------------------------------- | ----------------------------------- |
| 401    | Missing/invalid JWT                                   | Standard auth error                 |
| 404    | Conversation not found or doesn't belong to user      | "Conversation not found."           |
| 422    | Validation fails (empty message, bad ID format, etc.) | Joi error details                   |
| 429    | Rate limit exceeded                                   | "You've sent too many messages..."  |
| 502    | Gemini API returns an error                           | "I'm sorry, I'm having trouble..."  |
| 503    | `GEMINI_API_KEY` not set                              | "Gemini API key is not configured." |
| 504    | Gemini call takes > 30 seconds                        | "The AI service took too long..."   |

---

## Health Check

`GET /health` now includes Gemini status:

```json
{
  "services": {
    "mongodb": "connected",
    "redis": "connected",
    "gemini": {
      "status": "connected",
      "model": "gemini-2.5-flash",
      "latencyMs": 850
    }
  }
}
```

Gemini status values:

- `"connected"` — API key valid, model reachable
- `"disconnected"` — API call failed
- `"unconfigured"` — `GEMINI_API_KEY` env var not set

---

## How to Add a New Tool

Example: Adding a tool that checks product stock.

### Step 1: Add the declaration in `chatbot.tools.js`

Add to the `functionDeclarations` array:

```javascript
{
  name: "check_stock",
  description: "Check if a specific product is currently in stock.",
  parameters: {
    type: "OBJECT",
    properties: {
      productId: {
        type: "STRING",
        description: "The product's MongoDB ObjectId.",
      },
    },
    required: ["productId"],
  },
},
```

### Step 2: Add the handler

Add to the `handlers` object:

```javascript
async check_stock(args) {
  const product = await productModel
    .findById(args.productId)
    .select("name stock")
    .lean();
  if (!product) return { error: "Product not found." };
  return { name: product.name, stock: product.stock, inStock: product.stock > 0 };
},
```

### Step 3: (Optional) Add to CONTEXT_TOOLS if the frontend needs the raw data

```javascript
const CONTEXT_TOOLS = {
  // ... existing
  check_stock: "products", // ← data forwarded to client under context.products
};
```

That's it. No changes to the controller, service, or routes needed. Gemini will automatically start using the new tool when users ask stock-related questions.

---

## Important Notes & Gotchas

### For the team

1. **Never use `response.text()`** — In `@google/genai` v1.44.0, `.text` is a **getter property**, not a method. Use `response.text` (no parentheses).

2. **Conversations are server-side only** — We do NOT accept `history` from the client. The conversation is stored in MongoDB and loaded by `conversationId`. This prevents users from injecting fake messages.

3. **Sliding window = last 20 messages** — Older messages are not sent to Gemini (saves tokens). The full history is still in MongoDB and returned via `GET /conversations/:id`.

4. **The system prompt is sent on EVERY Gemini call** — Including tool re-calls. This is required to maintain consistent behavior. It's defined in `chatbot.prompts.js`.

5. **`context` object in response** — This is the structured DB data (real `_id`s, images, prices). The frontend should use this for rendering clickable UI elements. The `response` text is for display as the AI's message.

6. **Adding console.logs** — Don't use `console.log` in production code. Use the `logger` from `Utils/logger.js` (it's pino).

7. **Testing the chatbot** — Use Swagger UI at `/api-docs` → Chatbot section. There are 7 example payloads to try (including cart and reviews).

8. **Cost awareness** — Each message can trigger 1–6 Gemini API calls (initial + up to 5 tool loops). Token usage is tracked per message and logged. Monitor via `conversation.totalTokens`.

9. **100 message limit** — When a conversation hits 100 messages, the Mongoose validator rejects new saves. The user must start a new conversation.

10. **50 conversation limit** — Each user can have at most 50 active conversations. When creating a new conversation at the limit, the oldest one is auto-archived (soft-deleted). Conversations inactive for 90+ days are also auto-archived opportunistically.

11. **Soft delete** — `DELETE /chatbot/conversations/:id` sets `isActive: false`. The data remains in MongoDB. Don't use `deleteOne/deleteMany` on conversations.

12. **Soft delete** — `DELETE /chatbot/conversations/:id` sets `isActive: false`. The data remains in MongoDB. Don't use `deleteOne/deleteMany` on conversations.

13. **Response sanitization** — All AI text is passed through `sanitize-html` before being returned. Only safe markdown-compatible tags are allowed (`b`, `i`, `em`, `strong`, `ul`, `ol`, `li`, `p`, `br`, `code`, `pre`). Scripts and event handlers are stripped.

14. **Safety settings** — Gemini is configured to block `MEDIUM_AND_ABOVE` for all 4 harm categories (harassment, hate speech, sexually explicit, dangerous content). This is enforced on every API call.

15. **SSE streaming and tool calls** — The streaming endpoint resolves all tool calls synchronously first, then streams only the final text response. This is because Gemini cannot stream and tool-call simultaneously.

16. **Suggestions change per response** — The `suggestions` array is generated dynamically based on which tools were used. Don't cache suggestions across messages.
