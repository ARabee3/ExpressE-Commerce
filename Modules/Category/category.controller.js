import { categoryModel } from "../../Database/Models/category.model.js";
import { productModel } from "../../Database/Models/product.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";
import slugify from "slugify";

//add category
export const createCategory = catchAsync(async (req, res, next) => {
  const category = await categoryModel.insertOne(req.body);

  res.status(201).json({
    status: "success",
    data: category,
  });
});
//get all categories
export const getCategories = catchAsync(async (req, res, next) => {
  const categories = await categoryModel.find();

  res.status(200).json({
    status: "success",
    results: categories.lehgth,
    data: categories,
  });
});
//update category

export const updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (req.body.name) {
    req.body.slug = slugify(req.body.name, { lower: true });
  }

  const updatedCategory = await categoryModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedCategory) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.status(200).json({
    status: "success",
    data: updatedCategory,
  });
});

//delete category
export const deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const products = await productModel.find({ category: id });

  if (products.length > 0) {
    return next(
      new AppError("Cannot delete category with existing products", 400),
    );
  }

  const deletedCategory = await categoryModel.findByIdAndDelete(id);

  if (!deletedCategory) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
  });
});
