import { orderModel } from "../../Database/Models/order.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { productModel } from "../../Database/Models/product.model.js";
import { cartModel } from "../../Database/Models/cart.model.js";
import { couponModel } from "../../Database/Models/coupon.model.js";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const getUserOrders = catchAsync(async (req, res, next) => {
  const orders = await orderModel
    .find({ userId: req.user._id })
    .populate("orderItems.productId", "title price images")
    .sort({ createdAt: -1 });

  res.status(200).json({
    message: "Orders of this user",
    data: orders,
  });
});

const getOrderById = catchAsync(async (req, res, next) => {
  let orderId = req.params.id;
  const order = await orderModel
    .findOne({ _id: orderId })
    .populate("orderItems.productId", "title price images");

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
  const { cartId, shippingAddress, paymentMethod } = req.body;

  // Find cart and validate
  const cart = await cartModel.findById(cartId).populate("items.productId");
  if (!cart) {
    return next(new AppError("Cart not found", 404));
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

  // Create order
  const order = await orderModel.create({
    userId,
    cartId,
    shippingAddress,
    orderItems,
    totalOrderPrice,
    discountAmount,
    finalPrice,
    paymentMethod,
    couponId,
  });

  // Update stock
  for (const item of orderItems) {
    await productModel.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.quantity },
    });
  }

  // Soft delete the cart after successful order
  cart.isDeleted = true;
  await cart.save();

  res.status(201).json({
    status: "success",
    message: "Order created successfully",
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

  if (order.status !== "Pending") {
    return next(
      new AppError(`Cannot cancel order with status: ${order.status}`, 400),
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

  // loop on item to edit  stock
  for (const item of order.orderItems) {
    await productModel.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity },
    });
  }

  if (order.cartId) {
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

export {
  addOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updatePaidStatus,
  createPaymentIntent,
  stripeWebhook,
  trackOrder,
};
