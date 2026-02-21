import { AppError } from "../Utils/Error/AppError.js";
import { catchAsync } from "../Utils/Error/catchAsync.js";

export const isAuthor = (model, entity) => {
  return catchAsync(async (req, res, next) => {
    let entityId = req.params.id;
    if (entity === "cart") {
      entityId = req.body.cartId;
    }
    const userId = req.user._id;

    const document = await model.findOne({ _id: entityId, userId });

    if (!document) {
      return next(
        new AppError(
          `You are not the author of this ${entity} or it does not exist`,
          403,
        ),
      );
    }
    next();
  });
};
