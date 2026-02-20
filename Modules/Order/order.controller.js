import { orderModel } from "../../Database/Models/order.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { productModel } from "../../Database/Models/product.model.js";
import { cartModel } from "../../Database/Models/cart.model.js";
import { couponModel } from "../../Database/Models/coupon.model.js";

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
    return next(new AppError("Order status is not pending", 400));
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
        cancelledAt: order.cancelledAt
      },
    });
})

export { addOrder, getUserOrders, getOrderById, cancelOrder, updatePaidStatus, trackOrder };
