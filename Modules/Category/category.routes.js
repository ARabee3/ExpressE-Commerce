import express from "express";
import { createCategory,getCategories } from "./category.controller.js";
import { validateData } from "../../Middlewares/validationDate.js";
import { createCategoryValidation } from "../../Validations/categoryValidation.js";

const router = express.Router();

router.post("/categories",validateData(createCategoryValidation),createCategory);

router.get("/categories", getCategories);

export default router;
