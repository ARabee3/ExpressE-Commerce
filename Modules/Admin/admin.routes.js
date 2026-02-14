
import{ getUserById,
  deleteUser,
  updateUserRole,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getDashboardStats}from "./admin.controller.js";
import { Router } from "express";
import { isAdmin } from "../../Middlewares/isAdmin.js";

const adminRouter = Router();

adminRouter.use(isAdmin);

adminRouter.get("/users/:id", getUserById);
adminRouter.delete("/users/:id", deleteUser);
adminRouter.put("/users/:id/role", updateUserRole);

adminRouter.get("/orders", getAllOrders);
adminRouter.get("/orders/:id", getOrderById);
adminRouter.put("/orders/:id/status", updateOrderStatus);
adminRouter.delete("/orders/:id", deleteOrder);

adminRouter.get("/dashboard-stats", getDashboardStats);

export default adminRouter;