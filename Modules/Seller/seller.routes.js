import {
  getMyProducts,
  registerAsSeller,
  getSellerOrders,
  updateSellerOrderStatus,
} from "./seller.controller.js";
import { Router } from "express";
import { isSellerAndActive } from "../../Middlewares/isSellerAndActive.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";
import { validate } from "../../Middlewares/validate.js";
import { sellerValidation } from "../../Validations/sellerValidation.js";

const sellerRoutes = Router();

sellerRoutes.get(
  "/seller/my-products",
  verifyToken,
  isSellerAndActive,
  getMyProducts,
);
sellerRoutes.post(
  "/seller/register-as-seller",
  verifyToken,
  validate(sellerValidation),
  registerAsSeller,
);
sellerRoutes.get(
  "/seller/orders",
  verifyToken,
  isSellerAndActive,
  getSellerOrders,
);
sellerRoutes.put(
  "/seller/orders/:id/status",
  verifyToken,
  isSellerAndActive,
  updateSellerOrderStatus,
);

export default sellerRoutes;
