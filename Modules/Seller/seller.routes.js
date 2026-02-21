import { getMyProducts, registerAsSeller } from "./seller.controller.js";
import { Router } from "express";
import { isSellerAndActive } from "../../Middlewares/isSellerAndActive.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";

const sellerRoutes= Router();

sellerRoutes.get("/seller/my-products",verifyToken,isSellerAndActive,getMyProducts);
sellerRoutes.post("/seller/register-as-seller",verifyToken,registerAsSeller);

export default sellerRoutes;