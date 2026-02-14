import { AppError } from "../Utils/Error/AppError.js";


export const isAuthor = (model, entity) => {
  return async (req, res, next) => {
    let entityId = req.params.id; // if called from crud ops of oreder by id of order => in params
    if (entity === "cart") {
      entityId = req.body.cartId;
      // as if cart model => it be called from addOrder method to check cart belong to user or not
      //and cart id will be req.body not params
    }
    const id = req.user._id; // will get from verify token middleware

    const order = await model.findOne({ _id: entityId, userId: id });

    // console.log(entity);
    if (!order) {
      return next(
        new AppError(
          `You are not the author of this ${entity} or it does not exist`,
          403,
        ),
      );
    }
    next();
  };
};

//will be used in order to check if the user is the author of the cart before adding,updating or deleting
