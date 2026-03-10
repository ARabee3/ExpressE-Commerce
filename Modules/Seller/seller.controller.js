import { productModel } from "../../Database/Models/product.model.js";
import { orderModel } from "../../Database/Models/order.model.js";
import { userModel } from "../../Database/Models/user.model.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { sendOrderStatusEmail } from "../../Utils/Email/sendEmailWithOrderStatus.js";

const getMyProducts = catchAsync(async (req, res, next) => {
  const seller_id = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { sellerId: seller_id };

  const [products, totalProducts] = await Promise.all([
    productModel
      .find(filter)
      .populate("sellerId", "name storeName")
      .skip(skip)
      .limit(limit),
    productModel.countDocuments(filter),
  ]);

  if (!products || products.length === 0) {
    return next(new AppError("No products found for this seller", 404));
  }
  res.status(200).json({
    message: "Products of this seller",
    data: products,
    currentPage: page,
    totalPages: Math.ceil(totalProducts / limit),
    totalProducts,
  });
});

const registerAsSeller = catchAsync(async (req, res, next) => {
  const user = await userModel.findById(req.user._id).select("+role");
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  if (user.role === "Seller") {
    return next(new AppError("You are already a seller", 400));
  }
  if (user.role === "Admin") {
    return next(new AppError("You are admin can't be a seller", 400));
  }

  const updated = await userModel.findByIdAndUpdate(
    req.user._id,
    { role: "Seller", storeName: req.body.storeName },
    { new: true, runValidators: false },
  );

  res.status(200).json({
    message: "You are now registered as a seller",
    data: updated,
  });
});

const getSellerOrders = catchAsync(async (req, res, next) => {
  const sellerId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get all product IDs belonging to this seller
  const sellerProducts = await productModel.find({ sellerId }).select("_id");
  const productIds = sellerProducts.map((p) => p._id);

  const filter = { "orderItems.productId": { $in: productIds } };

  const [orders, totalOrders] = await Promise.all([
    orderModel
      .find(filter)
      .populate("userId", "name email phone")
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
    message: "Orders for your store",
    data: orders,
    currentPage: page,
    totalPages: Math.ceil(totalOrders / limit),
    totalOrders,
  });
});

const updateSellerOrderStatus = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const status = req.body.status;
  const sellerId = req.user._id;

  const order = await orderModel.findById(orderId);
  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Verify this order contains at least one product belonging to the seller
  const sellerProducts = await productModel.find({ sellerId }).select("_id");
  const sellerProductIds = sellerProducts.map((p) => p._id.toString());

  const hasSellerProduct = order.orderItems.some((item) =>
    sellerProductIds.includes(item.productId.toString()),
  );

  if (!hasSellerProduct) {
    return next(
      new AppError("You do not have permission to update this order", 403),
    );
  }

  if (!["Processing", "Shipped", "Delivered", "Cancelled"].includes(status)) {
    return next(
      new AppError(
        "Invalid status. Allowed: Processing, Shipped, Delivered, Cancelled",
        400,
      ),
    );
  }

  if (order.status === "Delivered" || order.status === "Cancelled") {
    return next(new AppError("Cannot update a completed order", 400));
  }

  const updateData = { status };
  if (status === "Processing") updateData.processedAt = new Date();
  if (status === "Shipped") updateData.shippedAt = new Date();
  if (status === "Delivered") updateData.deliveredAt = new Date();
  if (status === "Cancelled") updateData.cancelledAt = new Date();

  const updatedOrder = await orderModel
    .findByIdAndUpdate(orderId, updateData, { new: true })
    .populate("userId", "name email phone")
    .populate({
      path: "orderItems.productId",
      select: "name price images sellerId",
      populate: { path: "sellerId", select: "name storeName" },
    });

  // Restore stock if cancelled
  if (status === "Cancelled") {
    for (const item of order.orderItems) {
      await productModel.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }
  }

  // Notify the customer
  const user = await userModel.findById(order.userId);
  if (user) {
    await sendOrderStatusEmail(user.email, user.name, order._id, status);
  }

  res.status(200).json({
    message: "Order status updated",
    data: updatedOrder,
  });
});

export {
  getMyProducts,
  registerAsSeller,
  getSellerOrders,
  updateSellerOrderStatus,
};
