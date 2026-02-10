import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  shippingAddress: {
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
  },
  orderItems: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      productTitle: {
        type: String,
        required: true,
      },
      productImg: String,
      price: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
  totalOrderPrice: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["Card", "Cash", "Wallet"],
    required: true,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  paidAt: Date,
  status: {
    type: String,
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Pending",
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
  },
},{
timestamps:true
});


// index filteration

//compound for retrival user history orders
orderSchema.index({
    userId:1,
    createdAt:-1
})

orderSchema.index({
  status: 1
})

export const orderModel = mongoose.model("Order",orderSchema)