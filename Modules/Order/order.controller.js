import { orderModel } from "../../Database/Models/order.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { productModel } from "../../Database/Models/product.model.js";
import { cartModel } from "../../Database/Models/cart.model.js";
import { couponModel } from "../../Database/Models/coupon.model.js";
import { userModel } from "../../Database/Models/user.model.js";
import Stripe from "stripe";
import logger from "../../Utils/logger.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const getUserOrders = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { userId: req.user._id };

  const [orders, totalOrders] = await Promise.all([
    orderModel
      .find(filter)
      .populate({
        path: "orderItems.productId",
        select: "name price images sellerId",
        populate: { path: "sellerId", select: "name storeName" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    orderModel.countDocuments(filter),
  ]);

  res.status(200).json({
    message: "Orders of this user",
    data: orders,
    currentPage: page,
    totalPages: Math.ceil(totalOrders / limit),
    totalOrders,
  });
});

const getOrderById = catchAsync(async (req, res, next) => {
  let orderId = req.params.id;
  const order = await orderModel.findOne({ _id: orderId }).populate({
    path: "orderItems.productId",
    select: "name price images sellerId",
    populate: { path: "sellerId", select: "name storeName" },
  });

  if (!order) {
    return next(new AppError("order not found", 404));
  }
  res.status(200).json({
    message: "Order with this id ",
    data: order,
  });
});

const addOrder = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { cartId, addressId, shippingAddress, paymentMethod } = req.body;

  // Resolve shipping address: either from saved address or manually provided
  let resolvedAddress;

  if (addressId) {
    const user = await userModel.findById(userId);
    const savedAddress = user?.addresses?.id(addressId);
    if (!savedAddress) {
      return next(
        new AppError("Address not found in your saved addresses", 404),
      );
    }
    resolvedAddress = {
      street: savedAddress.street,
      city: savedAddress.city,
      state: savedAddress.state,
      phone: savedAddress.phone,
    };
  } else if (shippingAddress) {
    resolvedAddress = shippingAddress;
  } else {
    return next(
      new AppError("Either addressId or shippingAddress is required", 400),
    );
  }

  // Find cart and validate
  const cart = await cartModel.findById(cartId).populate("items.productId");
  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  // Prevent reusing a cart that already has an order
  if (cart.isDeleted) {
    return next(
      new AppError(
        "This cart already has a placed order. Please cancel the existing order or create a new cart.",
        400,
      ),
    );
  }

  // For card payments, block if user already has a pending unpaid card order
  if (paymentMethod === "Card") {
    const existingPendingOrder = await orderModel.findOne({
      userId,
      status: "Pending",
      paymentMethod: "Card",
      isPaid: false,
    });

    if (existingPendingOrder) {
      return next(
        new AppError(
          "You already have a pending card order. Please complete payment or cancel it before placing a new order.",
          400,
        ),
      );
    }
  }

  // Filter active items only
  const activeItems = cart.items.filter((item) => !item.isDeleted);
  if (activeItems.length === 0) {
    return next(new AppError("Cart is empty", 400));
  }

  // Build order items and calculate total
  const orderItems = [];
  let totalOrderPrice = 0;

  for (const item of activeItems) {
    const product = item.productId;
    if (!product) {
      return next(
        new AppError(`Product with id ${item.productId} is not found`, 404),
      );
    }

    if (product.stock < item.quantity) {
      return next(
        new AppError(
          `Insufficient stock for "${product.name}". Only ${product.stock} available`,
          400,
        ),
      );
    }

    totalOrderPrice += product.price * item.quantity;

    orderItems.push({
      productId: product._id,
      productTitle: product.name,
      productImg:
        product.images && product.images.length > 0 ? product.images[0] : "",
      price: product.price,
      quantity: item.quantity,
    });
  }

  // Handle coupon from cart
  let discountAmount = 0;
  let finalPrice = totalOrderPrice;
  let couponId = null;

  if (cart.appliedCoupon) {
    const coupon = await couponModel.findById(cart.appliedCoupon);
    if (coupon && coupon.isActive) {
      if (coupon.expireDate && new Date(coupon.expireDate) < new Date()) {
        return next(new AppError("Applied coupon has expired", 400));
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return next(new AppError("Applied coupon reached usage limit", 400));
      }

      if (coupon.discountType === "percentage") {
        discountAmount = (totalOrderPrice * coupon.discount) / 100;
      } else {
        discountAmount = coupon.discount;
      }

      discountAmount = Math.min(discountAmount, totalOrderPrice);
      finalPrice = totalOrderPrice - discountAmount;
      couponId = coupon._id;

      await couponModel.updateOne(
        { _id: coupon._id },
        { $inc: { usedCount: 1 } },
      );
    }
  }

  // For cash orders, skip "Pending" and go straight to "Processing"
  const isCash = paymentMethod === "Cash";

  // Create order
  const order = await orderModel.create({
    userId,
    cartId,
    shippingAddress: resolvedAddress,
    orderItems,
    totalOrderPrice,
    discountAmount,
    finalPrice,
    paymentMethod,
    couponId,
    status: isCash ? "Processing" : "Pending",
    processedAt: isCash ? new Date() : undefined,
  });

  // Atomically update stock — the filter ensures stock doesn't go negative
  for (const item of orderItems) {
    const result = await productModel.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true },
    );
    if (!result) {
      // Rollback already decremented stock for previous items
      for (const prev of orderItems) {
        if (prev.productId.toString() === item.productId.toString()) break;
        await productModel.findByIdAndUpdate(prev.productId, {
          $inc: { stock: prev.quantity },
        });
      }
      // Delete the just-created order
      await orderModel.findByIdAndDelete(order._id);
      return next(
        new AppError(
          `Insufficient stock for product "${item.productTitle}". Please try again.`,
          409,
        ),
      );
    }
  }

  // For cash orders, hard-delete the cart (order is committed, no payment to wait for)
  // For card orders, soft-delete the cart (can be restored if payment fails)
  if (isCash) {
    await cartModel.findByIdAndDelete(cartId);
  } else {
    cart.isDeleted = true;
    await cart.save();
  }

  res.status(201).json({
    status: "success",
    message: isCash
      ? "Order placed successfully (Cash on Delivery). Your order is being processed."
      : "Order created successfully. Please complete payment.",
    data: order,
  });
});

const cancelOrder = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const userId = req.user._id;

  const order = await orderModel.findById(orderId);

  if (!order) {
    return next(new AppError("order not found", 404));
  }

  // can only cancel unpaid pending orders
  if (order.isPaid) {
    return next(new AppError("Cannot cancel a paid order", 400));
  }

  // For card orders: can only cancel if status is "Pending" (before payment)
  // For cash orders: can cancel if status is "Pending" or "Processing" (before shipping)
  const isCash = order.paymentMethod === "Cash";
  const cancellableStatuses = isCash
    ? ["Pending", "Processing"]
    : ["Pending"];

  if (!cancellableStatuses.includes(order.status)) {
    return next(
      new AppError(
        `Cannot cancel order with status: ${order.status}. ${isCash ? "Cash orders can only be cancelled before shipping." : "Card orders can only be cancelled before payment."}`,
        400,
      ),
    );
  }

  // update order status
  const updatedOrder = await orderModel.findByIdAndUpdate(
    orderId,
    {
      $set: {
        status: "Cancelled",
        cancelledAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

  // Restore stock for each item
  for (const item of order.orderItems) {
    await productModel.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity },
    });
  }

  // Rollback coupon usage count
  if (order.couponId) {
    await couponModel.findByIdAndUpdate(order.couponId, {
      $inc: { usedCount: -1 },
    });
  }

  // For card orders, restore the soft-deleted cart so user can retry
  // For cash orders, cart was already hard-deleted, nothing to restore
  if (!isCash && order.cartId) {
    await cartModel.findByIdAndUpdate(order.cartId, { isDeleted: false });
  }

  res.status(200).json({
    message: "order cancelled successfully",
    data: updatedOrder,
  });
});

const updatePaidStatus = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const orderId = req.params.id;
  const order = await orderModel.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.isPaid) {
    return next(new AppError("Order is already paid", 400));
  }

  // Cash orders are paid on delivery — only admin can mark them as paid
  if (order.paymentMethod === "Cash") {
    return next(
      new AppError(
        "Cash on Delivery orders are marked as paid upon delivery by admin",
        400,
      ),
    );
  }

  // update payment info

  const updatedOrder = await orderModel.findOneAndUpdate(
    { _id: orderId, status: "Pending" },
    {
      $set: {
        isPaid: true,
        paidAt: new Date(),
        status: "Processing",
      },
    },
    {
      new: true,
    },
  );

  if (!updatedOrder) {
    return next(
      new AppError("Order must be in Pending status to be paid", 400),
    );
  }

  if (updatedOrder.cartId) {
    await cartModel.findByIdAndDelete(updatedOrder.cartId);
  }
  res.status(200).json({
    message: "order paid status updated",
    data: updatedOrder,
  });
});

// track order status
const trackOrder = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const order = await orderModel.findById(orderId);

  res.status(200).json({
    message: "order status",
    data: {
      status: order.status,
      processedAt: order.processedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
    },
  });
});

const createPaymentIntent = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const orderId = req.params.id;

  if (!stripe) {
    return next(new AppError("Stripe secret key is not configured", 500));
  }

  const order = await orderModel.findOne({ _id: orderId, userId });

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.isPaid) {
    return next(new AppError("Order is already paid", 400));
  }

  if (order.status !== "Pending") {
    return next(new AppError("Only pending orders can start payment", 400));
  }

  if (order.paymentMethod !== "Card") {
    return next(
      new AppError(
        "Payment intent is only available for Card payment method",
        400,
      ),
    );
  }

  const amount = Math.round(order.finalPrice * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    payment_method_types: ["card"],
    metadata: {
      orderId: order._id.toString(),
      userId: order.userId.toString(),
    },
  });

  res.status(200).json({
    status: "success",
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
});

const stripeWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return next(new AppError("Missing Stripe signature", 400));
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return next(new AppError("Stripe webhook secret is not configured", 500));
  }

  if (!stripe) {
    return next(new AppError("Stripe secret key is not configured", 500));
  }

  const event = stripe.webhooks.constructEvent(
    req.body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    if (orderId) {
      const order = await orderModel.findById(orderId);

      if (order && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = "Processing";
        await order.save();

        if (order.cartId) {
          await cartModel.findByIdAndDelete(order.cartId);
        }
      }
    }
  }

  res.status(200).json({ received: true });
});

const confirmPayment = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const orderId = req.params.id;
  const { paymentIntentId } = req.body;

  if (!stripe) {
    return next(new AppError("Stripe secret key is not configured", 500));
  }

  if (!paymentIntentId) {
    return next(new AppError("paymentIntentId is required", 400));
  }

  const order = await orderModel.findOne({ _id: orderId, userId });

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.isPaid) {
    return next(new AppError("Order is already paid", 400));
  }

  if (order.status !== "Pending") {
    return next(new AppError("Only pending orders can be confirmed", 400));
  }

  if (order.paymentMethod !== "Card") {
    return next(
      new AppError(
        "Payment confirmation is only available for Card payment method",
        400,
      ),
    );
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.metadata?.orderId !== orderId) {
    return next(new AppError("PaymentIntent does not match this order", 400));
  }

  if (paymentIntent.status !== "succeeded") {
    return next(
      new AppError(
        `Payment not completed. Current status: ${paymentIntent.status}`,
        400,
      ),
    );
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.status = "Processing";
  await order.save();

  if (order.cartId) {
    await cartModel.findByIdAndDelete(order.cartId);
  }

  res.status(200).json({
    status: "success",
    message: "Payment confirmed successfully",
    data: {
      orderId: order._id,
      isPaid: order.isPaid,
      status: order.status,
      paidAt: order.paidAt,
    },
  });
});

export {
  addOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updatePaidStatus,
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
  trackOrder,
};
