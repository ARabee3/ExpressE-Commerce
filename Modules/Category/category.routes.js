import express from "express";
import { createCategory,getCategories, updateCategory, deleteCategory } from "./category.controller.js";
import { validate } from "../../Middlewares/validate.js";
import { createCategoryValidation, updateCategoryValidation ,deleteCategoryValidation} from "../../Validations/categoryValidation.js";
import { verifyToken } from "../../Middlewares/verifyToken.js"
import { isSellerAndActive } from "../../Middlewares/isSellerAndActive.js";


const router = express.Router();

router.post("/categories", verifyToken, isSellerAndActive, validate(createCategoryValidation), createCategory);

router.get("/categories", getCategories);

router.put("/categories/:id",verifyToken,isSellerAndActive,validate(updateCategoryValidation),updateCategory);

router.delete("/categories/:id",verifyToken,isSellerAndActive,validate(deleteCategoryValidation),deleteCategory);

export default router;
