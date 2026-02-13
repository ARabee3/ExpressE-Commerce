import express from "express";
import { createProduct, getProducts } from "./product.controller.js";
import { validateData } from "../../Middlewares/validationDate.js";
import { productValidation } from "../../Validations/productValidation.js";

const productsRoutes = express.Router();

productsRoutes.post("/products",validateData(productValidation),createProduct);

productsRoutes.get("/products",getProducts);

export default productsRoutes;