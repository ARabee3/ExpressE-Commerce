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
  // get data from req.body
  let userId = req.user._id;
  let cartId = req.body.cartId;
  let shippingAddress = req.body.shippingAddress;
  let paymentMethod = req.body.paymentMethod;
  let couponId = req.body.couponId;

  // check if cart has items or not
  let cart = await cartModel.findById(cartId);
  if (cart.items.length === 0) {
    return next(new AppError("Cart is empty ", 404));
  }
  let orderItems = [];
  let totalOrderPrice = 0;
  let discountAmount = 0;
  let finalPrice = totalOrderPrice;
  for (const item of cart.items) {
    let product = await productModel.findById(item.productId);
    // check if exist
    if (!product) {
      return next(
        new AppError(`product with id ${item.productId} is not found`, 404),
      );
    }

    // check if in stock
    if (product.stockQuantity < item.quantity) {
      return next(
        new AppError(
          `Insufficient stock for product: ${product.title} Just exist ${product.stockQuantity}`,
          404,
        ),
      );
    }
    // calc total price for every item
    totalOrderPrice += product.price * item.quantity;

    // add items to orderItems
    orderItems.push({
      productId: product._id,
      productTitle: product.title,
      productImg:
        product.images && product.images.length > 0 ? product.images[0] : "",
      price: product.price,
      quantity: item.quantity,
    });
  }
  if (couponId) {
    let coupon = await couponModel.findById(couponId);
    if (!coupon) {
      return next(new AppError(`coupon with id ${couponId} is not found`, 404));
    }
    // check if skip expiryDate or not
    if (coupon.expireDate && new Date(coupon.expireDate) < new Date()) {
      return next(new AppError(`coupon with id ${couponId} is expired`, 400));
    }

    // check if coupn skip usage count
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return next(
        new AppError(`coupon with id ${couponId} reached usage limit`, 400),
      );
    }
    // if discount is percentage
    if (coupon.discountType === "percentage") {
      discountAmount = (totalOrderPrice * coupon.discount) / 100;
    } else {
      discountAmount = coupon.discount;
    }

    finalPrice = totalOrderPrice - discountAmount;
    // update used count of this coupon and inc it by one
    await couponModel.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
  }

  // add order
  const order = await orderModel.create({
    userId,
    shippingAddress,
    orderItems,
    totalOrderPrice,
    discountAmount,
    finalPrice,
    paymentMethod,
    couponId: couponId || null,
  });

  // update stock
  for (const item of orderItems) {
    await productModel.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.quantity },
    });
  }

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: {
      orderId: order._id,
      orderItems: order.orderItems,
      totalOrderPrice: order.totalOrderPrice,
      discountAmount: order.discountAmount,
      finalPrice: order.finalPrice,
      status: order.status,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
    },
  });
});

const cancelOrder = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const userId = req.user._id;

  const order = await orderModel.findById(orderId);

  if (!order) {
    return next(new AppError("order not found", 404));
  }

  // can only cancel pending or processing orders
  if (!["Pending", "Processing"].includes(order.status)) {
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
  res.status(200).json({
    message: "order paid status updated",
    data: updatedOrder,
  });
});

export { addOrder, getUserOrders,getOrderById,cancelOrder,updatePaidStatus };
