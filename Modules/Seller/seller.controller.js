import { productModel } from "../../Database/Models/product.model.js";
import { userModel } from "../../Database/Models/user.model.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";

const getMyProducts = catchAsync(async(req,res,next)=>{
    const seller_id = req.user._id;
    const products = await productModel.find({ sellerId: seller_id });
    
    if(!products || products.length === 0)
    {
        return next(new AppError("No products found for this seller",404));
    }
    res.status(200).json({
        message:"Products of this seller",
        data:products
    })
})

const registerAsSeller = catchAsync(async(req,res,next)=>{
    const user = await userModel.findById(req.user._id);
    if(!user) {
        return next(new AppError("User not found",404));
    }
    if(user.role === "Seller")
    {
        return next(new AppError("You are already a seller",400));
    }
    user.role = "Seller";
    user.storeName = req.body.storeName;
    await user.save();
    res.status(200).json({
        message:"You are now registered as a seller",
        data:user
    })
})

export {getMyProducts,registerAsSeller}