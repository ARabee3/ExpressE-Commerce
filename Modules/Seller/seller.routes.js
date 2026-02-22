import { getMyProducts, registerAsSeller } from "./seller.controller.js";
import { Router } from "express";
import { isSellerAndActive } from "../../Middlewares/isSellerAndActive.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";
import { validate } from "../../Middlewares/validate.js";
import { sellerValidation } from "../../Validations/sellerValidation.js";

const sellerRoutes= Router();

sellerRoutes.get("/seller/my-products",verifyToken,isSellerAndActive,getMyProducts);
sellerRoutes.post("/seller/register-as-seller",verifyToken,validate(sellerValidation),registerAsSeller);

export default sellerRoutes;