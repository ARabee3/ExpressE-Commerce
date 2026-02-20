import express from "express";
import { createProduct, getProducts } from "./product.controller.js";
import { productValidation } from "../../Validations/productValidation.js";
import { validate } from "../../Middlewares/validate.js";

const productsRoutes = express.Router();

productsRoutes.post("/products", validate(productValidation), createProduct);

productsRoutes.get("/products", getProducts);

export default productsRoutes;
