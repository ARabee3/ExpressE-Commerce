import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "model"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    toolCalls: {
      type: [String],
      default: [],
    },
    tokenCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: true, timestamps: true },
);

const conversationSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Conversation",
      trim: true,
      maxlength: 200,
    },
    messages: {
      type: [messageSchema],
      default: [],
      validate: {
        validator(arr) {
          return arr.length <= 100;
        },
        message:
          "Conversation cannot exceed 100 messages. Please start a new one.",
      },
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index for efficient user queries
conversationSchema.index({ userId: 1, updatedAt: -1 });

// Auto-generate title from first user message
conversationSchema.pre("save", function () {
  if (this.isNew && this.messages.length > 0) {
    const firstUserMsg = this.messages.find((m) => m.role === "user");
    if (firstUserMsg) {
      this.title =
        firstUserMsg.content.slice(0, 80) +
        (firstUserMsg.content.length > 80 ? "..." : "");
    }
  }
});

export const conversationModel = mongoose.model(
  "Conversation",
  conversationSchema,
);
