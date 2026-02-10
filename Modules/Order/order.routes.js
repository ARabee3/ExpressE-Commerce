
import express from "express"
import { validateData } from "../../Middlewares/validationDate.js"
import { orderModel } from "../../Database/Models/order.model.js"
import { addOrder } from "./order.controller.js"
import { orderValidation } from "../../Validations/orderValidation.js"


const orderRoutes = express.Router()

orderRoutes.post("/orders",validateData(orderValidation),addOrder)


export default orderRoutes;