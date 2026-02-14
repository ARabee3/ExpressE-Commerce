import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { userModel } from "../../Database/Models/user.model.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { orderModel } from "../../Database/Models/order.model.js";
import { productModel } from "../../Database/Models/product.model.js";
import { sendOrderStatusEmail } from "../../Utils/Email/sendEmailWithOrderStatus.js";

const getUserById = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const user = await userModel
    .findById(userId)
    .select("-password")
    .populate("wishlist", "title price images");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    message: "user data",
    data: user,
  });
});

const deleteUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const user = await userModel.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if(user.isDeleted){
    return next(new AppError("User already deleted", 400));
  }

  if(user.role === "Admin") {
    return next(new AppError("You can't delete admin user", 403));
  }

    const deletedUser = await userModel.findByIdAndUpdate(userId, { isDeleted: true }, { new: true }).select("-password");


  res.status(200).json({
    message: "user deleted",
    data: deletedUser,
  });
});

const updateUserRole = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const role = req.body.role

    const user = await userModel.findById(userId);


    // if not found
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    //if deleted
    if(user.isDeleted){
      return next(new AppError("User is deleted", 400));
    }

    // if admin
    if(user.role === "Admin") {
      return next(new AppError("You can't update admin user role", 403));
    }
    
    // if send invalid role in body
    if(!["Customer", "Seller","Admin"].includes(role)) {
      return next(new AppError("Invalid role. Role must be either 'Customer', 'Seller', or 'Admin'", 400));
    }

    const updatedUser = await userModel.findByIdAndUpdate(userId, { role }, { new: true }).select("-password");

    res.status(200).json({
      message: "user role updated",
      data: updatedUser,
    });
});

// controll orders by admin
const getAllOrders = catchAsync(async (req, res, next) => {
    
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const skip = (limit * (page - 1));

    const orders = await orderModel.find()
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email phone')
      .populate('orderItems.productId', 'title price images')

      const totalOrders = await orderModel.countDocuments();

    res.status(200).json({
      message: "orders data",
      data: orders,
      countOfOrders: totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
    });
});

const getOrderById = catchAsync(async (req, res, next) => {
    const orderId = req.params.id;

    const order = await orderModel.findById(orderId)
      .populate('userId', 'name email phone')
      .populate('orderItems.productId', 'title price images');

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    res.status(200).json({
      message: "order data",
      data: order,
    });
});

const updateOrderStatus = catchAsync(async (req, res, next) => {
    const orderId = req.params.id;
    const status = req.body.status;

    const order = await orderModel.findById(orderId);
    
    if (!order) {
      return next(new AppError("Order not found", 404));
    }
    if(!["Processing", "Shipped", "Delivered", "Cancelled"].includes(status)) {
        return next(new AppError("Invalid status. Status must be either 'Processing', 'Shipped', 'Delivered', or 'Cancelled'", 400));
    }
    if (status === 'Delivered') {
      order.deliveredAt = new Date();
    }

    if (status === 'Cancelled') {
      updateData.cancelledAt = new Date();
    }

    const updatedOrder = await orderModel.findByIdAndUpdate(orderId, { status }, { new: true })
        .populate('userId', 'name email phone')
        .populate('orderItems.productId', 'title price images');


        // restore stock if order is cancelled
    if (status === 'Cancelled') {
      for (const item of order.orderItems) {
        await productModel.findByIdAndUpdate(
          item.productId,
          { $inc: { stockQuantity: item.quantity } }
        );
      } 
    }


    // send notification email to user about order status update
    const user = await userModel.findById(order.userId);
    await sendOrderStatusEmail(user.email, user.name, order._id, status);

    res.status(200).json({
      message: "order status updated",
      data: updatedOrder,
    });
})


const deleteOrder = catchAsync(async (req, res, next) => {
    const orderId = req.params.id;

    const order = await orderModel.findById(orderId);

    if (!order) {
      return next(new AppError("Order not found", 404));
    }


     if (order.status !== "Cancelled") {
         return next(new AppError("Only cancelled orders can be deleted", 400));
     }

    const deletedOrder = await orderModel.findByIdAndDelete(orderId);

    res.status(200).json({
      message: "order deleted",
      data: deletedOrder
    });
})

const getDashboardStats = catchAsync(async (req, res, next) => {
    // get active users
    const totalUsers = await userModel.countDocuments({ isDeleted: false });

    // all orders
    const totalOrders = await orderModel.countDocuments();

    // success orders data
    const salesData = await orderModel.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalPrice' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const totalSales = salesData[0]?.totalRevenue || 0;
    const paidOrders = salesData[0]?.totalOrders || 0;

    res.status(200).json({
      message: "dashboard stats",
      data: {
        totalUsers,
        totalOrders,
        totalSales,
        paidOrders
      }
    });
});

export {
  getUserById,
  deleteUser,
  updateUserRole,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getDashboardStats
};

        
