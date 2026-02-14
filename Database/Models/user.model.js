import mongoose, { Schema } from "mongoose";
import { hashPassword } from "../../Utils/hashPassword.js";
import jwt from "jsonwebtoken";

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
  return jwt.sign(
    { _id: this._id, email: this.email, role: this.role },
    process.env.SECRETKEY,
    { expiresIn: "1h" }, // You can also use an environment variable for expiration
  );
};
export const userModel = mongoose.model("User", userSchema);
