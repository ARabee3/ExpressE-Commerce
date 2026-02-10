import { orderModel } from "../../Database/Models/order.model.js";
import { catchAsync } from "../../Utils/catchAsync.js";

 const addOrder = catchAsync(async (req, res, next) => {
  const addedOrder = await orderModel.insertOne(req.body);
  res.status(201).json({ status: "success", data: addedOrder });
});


export{
    addOrder
}