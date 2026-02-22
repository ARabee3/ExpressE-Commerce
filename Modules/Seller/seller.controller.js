import { productModel } from "../../Database/Models/product.model.js";
import { userModel } from "../../Database/Models/user.model.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";

const getMyProducts = catchAsync(async(req,res,next)=>{
    const seller_id = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { sellerId: seller_id };

    const [products, totalProducts] = await Promise.all([
      productModel.find(filter).skip(skip).limit(limit),
      productModel.countDocuments(filter),
    ]);
    
    if(!products || products.length === 0)
    {
        return next(new AppError("No products found for this seller",404));
    }
    res.status(200).json({
        message:"Products of this seller",
        data:products,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
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