import { categoryModel } from "../../Database/Models/category.model.js";
import { catchAsync} from "../../Utils/catchAsync.js";
import { AppError } from "../../Utils/AppError.js";

export const createCategory = catchAsync(async (req,res,next) => {
    const category = await categoryModel.insertOne(req.body);

    res.status(201).json({
        status: "success",
        data: category
    });
});

export const getCategories = catchAsync(async (req,res,next) => {
    const categories = await categoryModel.find();

    res.status(200).json({
        status: "success",
        results: categories.lehgth,
        data: categories
    });
});