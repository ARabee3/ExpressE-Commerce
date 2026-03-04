import { productModel } from "../../Database/Models/product.model.js";
import { categoryModel } from "../../Database/Models/category.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import slugify from "slugify";
import { AppError } from "../../Utils/Error/AppError.js";
//create product
export const createProduct = catchAsync(async (req, res, next) => {
  req.body.sellerId = req.user._id;
  // Make sure images uploaded
  if (!req.files || req.files.length === 0) {
    return next(new AppError("Product must have at least one image", 400));
  }
  // Convert files to array of paths
  const imagePaths = req.files.map((file) => file.path);

  const product = await productModel.create({
    ...req.body,
    images: imagePaths,
  });

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
      return next(new AppError("Category not found ", 404));
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
//get product by id
export const getProductById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const product = await productModel
    .findById(id)
    .populate("category", "name slug");

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: product,
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
  if (req.files && req.files.length > 0) {
    req.body.images = req.files.map((file) => file.path);
  }
  const updatedProduct = await productModel.findByIdAndUpdate(
    id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedProduct) {
    return next(new AppError("Product not found ", 404));
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
    return next(new AppError("Product not found ", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
});
