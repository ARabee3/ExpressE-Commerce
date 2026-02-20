import express from "express";
import { createCategory, getCategories } from "./category.controller.js";
import { createCategoryValidation } from "../../Validations/categoryValidation.js";
import { validate } from "../../Middlewares/validate.js";

const router = express.Router();

router.post("/categories", validate(createCategoryValidation), createCategory);

router.get("/categories", getCategories);

export default router;
