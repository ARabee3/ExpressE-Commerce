import { productModel } from "../../Database/Models/product.model.js";
import { categoryModel } from "../../Database/Models/category.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import slugify from "slugify";
//create product
export const createProduct = catchAsync(async (req, res, next) => {
  const product = await productModel.insertOne(req.body);

  res.status(201).json({
    status: "success",
    data: product,
  });
});
//get products
export const getProducts = catchAsync(async (req, res, next) => {
  const {
    keyword,
    category,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 10,
  } = req.query;

  let filter = {};

  //search by name
  if (keyword) {
    filter.name = { $regex: keyword, $options: "i" };
  }
  //filter by category slug
  if (category) {
    const foundCategory = await categoryModel.findOne({ slug: category });

    if (!foundCategory) {
      return res.status(404).json({ message: "Category not found" });
    }
    filter.category = foundCategory._id;
  }
  //filter by price range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) {
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice) {
      filter.price.$lte = Number(maxPrice);
    }
  }
  //sorting
  let sortOption = {};
  if (sort) {
    if (sort === "price") sortOption.price = 1;
    if (sort === "-price") sortOption.price = -1;
    if (sort === "newest") sortOption.createdAt = -1;
  }
  //pagination
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const skip = (pageNumber - 1) * limitNumber;

  const products = await productModel
    .find(filter)
    .populate("category")
    .sort(sortOption)
    .skip(skip)
    .limit(limitNumber);

  //total count for frontend pagination
  const totalProducts = await productModel.countDocuments(filter);

  res.status(200).json({
    totalProducts,
    totalPages: Math.ceil(totalProducts / limitNumber),
    currentPage: pageNumber,
    products,
  });
});

//updateProduct
export const updateProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const allowedFields = [
    "name",
    "description",
    "price",
    "stock",
    "images",
    "category",
  ];

  const filteredBody = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      filteredBody[field] = req.body[field];
    }
  });

  if (req.body.name) {
    req.body.slug = slugify(req.body.name, { lower: true });
  }
  const updatedProduct = await productModel.findByIdAndUpdate(id, filteredBody, {
    new: true,
    runValidators: true,
  });

  if (!updatedProduct) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.status(200).json({
    status: "success",
    data: updatedProduct,
  });
});

//delete Product
export const deleteProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedProduct = await productModel.findByIdAndDelete(id);

  if (!deletedProduct) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
    
  });
});
