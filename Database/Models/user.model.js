import mongoose, { Schema } from "mongoose";
import { hashPassword } from "../../Utils/hashPassword.js";
import jwt from "jsonwebtoken";

const getRequiredSecret = (primaryKey, fallbackKey) => {
  const secret = process.env[primaryKey] || (fallbackKey ? process.env[fallbackKey] : undefined);
  if (!secret) {
    throw new Error(
      `Missing JWT secret. Please set ${primaryKey}${fallbackKey ? ` or ${fallbackKey}` : ""} in environment variables.`,
    );
  }
  return secret;
};

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Customer", "Admin", "Seller"],
      default: "Customer",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    addresses: [
      {
        city: {
          type: String,
          required: true,
          trim: true,
        },
        street: {
          type: String,
          required: true,
          trim: true,
        },
        phone: {
          type: String,
          trim: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true, versionKey: false },
);

userSchema.pre("save", hashPassword);

userSchema.methods.generateToken = function () {
  const accessSecret = getRequiredSecret("SECRETKEY", "JWT_SECRET");
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
      isDeleted: this.isDeleted,
    },
    accessSecret,
    { expiresIn: "30m" },
  );
};

userSchema.methods.generateRefreshToken = function () {
  const refreshSecret =
    process.env.REFRESH_TOKEN_SECRET ||
    process.env.JWT_REFRESH_SECRET ||
    process.env.refreshToken ||
    process.env.SECRETKEY ||
    process.env.JWT_SECRET;

  if (!refreshSecret) {
    throw new Error(
      "Missing JWT secret. Please set REFRESH_TOKEN_SECRET or JWT_REFRESH_SECRET in environment variables.",
    );
  }
  const refreshToken = jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
      isDeleted: this.isDeleted,
    },
    refreshSecret,
    {
      expiresIn: "7d",
    },
  );

  return refreshToken;
};

export const userModel = mongoose.model("User", userSchema);
