import {
  getUserById,
  deleteUser,
  updateUserRole,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getDashboardStats,
  getAllSellers,
  approveSeller,
  suspendSeller,
  reactiveSeller
} from "./admin.controller.js";
import { Router } from "express";
import { isAdmin } from "../../Middlewares/isAdmin.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";

const adminRouter = Router();

adminRouter.use(verifyToken);

adminRouter.get("/users/:id", isAdmin, getUserById);
adminRouter.delete("/users/:id", isAdmin, deleteUser);
adminRouter.put("/users/:id/role", isAdmin, updateUserRole);

adminRouter.get("/orders", isAdmin, getAllOrders);
adminRouter.get("/orders/:id", isAdmin, getOrderById);
adminRouter.put("/orders/:id/status", isAdmin, updateOrderStatus);
adminRouter.delete("/orders/:id", isAdmin, deleteOrder);

adminRouter.get("/dashboard-stats", isAdmin, getDashboardStats);
//routes to control sellers
adminRouter.get("/sellers", isAdmin, getAllSellers);
adminRouter.put("/sellers/:id/approve", isAdmin, approveSeller);
adminRouter.put("/sellers/:id/suspend", isAdmin, suspendSeller);
adminRouter.put("/sellers/:id/reactivate", isAdmin, reactiveSeller);
export default adminRouter;
