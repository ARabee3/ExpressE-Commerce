import express from "express";
import { createProduct, getProducts, updateProduct, deleteProduct } from "./product.controller.js";
import { productValidation, updateProductValidation, deleteProductValidation } from "../../Validations/productValidation.js";
import { validate } from "../../Middlewares/validate.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";
import { isSellerAndActive } from "../../Middlewares/isSellerAndActive.js";


const productsRoutes = express.Router();

productsRoutes.post("/products", verifyToken,isSellerAndActive,validate(productValidation), createProduct);

productsRoutes.get("/products", getProducts);

productsRoutes.put("/products/:id", verifyToken,isSellerAndActive,validate(updateProductValidation), updateProduct);
productsRoutes.delete("/products/:id", verifyToken,isSellerAndActive,validate(deleteProductValidation), deleteProduct);

export default productsRoutes;
