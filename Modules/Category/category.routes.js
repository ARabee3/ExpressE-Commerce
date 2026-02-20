import express from "express";
import { createCategory,getCategories, updateCategory, deleteCategory } from "./category.controller.js";
import { validate } from "../../Middlewares/validate.js";
import { createCategoryValidation, updateCategoryValidation ,deleteCategoryValidation} from "../../Validations/categoryValidation.js";
import { verifyToken } from "../../Middlewares/verifyToken.js"
import { isAdmin } from "../../Middlewares/isAdmin.js";


const router = express.Router();

router.post("/categories", validate(createCategoryValidation), createCategory);

router.get("/categories", getCategories);

router.put("/categories/:id",verifyToken,isAdmin,validate(updateCategoryValidation),updateCategory);

router.delete("/categories/:id",verifyToken,isAdmin,validate(deleteCategoryValidation),deleteCategory);

export default router;
