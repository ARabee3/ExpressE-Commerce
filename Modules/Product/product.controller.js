import { populate } from "dotenv";
import { productModel } from "../../Database/Models/product.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";

export const createProduct = catchAsync(async (req, res, next) => {
  const product = await productModel.insertOne(req.body);

  res.status(201).json({
    status: "success",
    data: product,
  });
});

export const getProducts = catchAsync(async (req, res, next) => {
  const products = await productModel.find().populate("category");

  res.status(200).json({
    status: "success",
    results: products.length,
    data: products,
  });
});
