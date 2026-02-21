import { AppError } from "../Utils/Error/AppError.js"

export const isSellerAndActive = (req,res,next)=>{
    if(req.user.role !== "Seller" || !req.user.isApproved || !req.user.isActive){
            return next(
              new AppError("Access denied. Seller only can access it, or the seller is not approved or not active", 403),
            );
    }
    next();
}