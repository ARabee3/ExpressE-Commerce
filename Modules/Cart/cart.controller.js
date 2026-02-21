import { cartModel } from "../../Database/Models/cart.model.js";
import { productModel } from "../../Database/Models/product.model.js";
import { couponModel } from "../../Database/Models/coupon.model.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import { AppError } from "../../Utils/Error/AppError.js";

// --- Helpers ---

const generateSessionId = () =>
  `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getCartIdentifier = (req) => {
  const userId = req.user?._id || null;
  const sessionId = !userId
    ? req.body.sessionId || req.headers["x-session-id"] || null
    : null;
  return { userId, sessionId };
};

const findCart = (userId, sessionId) => {
  const query = userId
    ? { userId, isDeleted: false }
    : { sessionId, isDeleted: false };
  return cartModel.findOne(query);
};

const recalcCart = async (cart) => {
  await cart.populate("items.productId");

  let totalPrice = 0;
  for (const item of cart.items) {
    if (!item.isDeleted && item.productId) {
      totalPrice += item.productId.price * item.quantity;
    }
  }
  cart.totalPrice = totalPrice;

  // Apply coupon if exists
  if (cart.appliedCoupon) {
    await cart.populate("appliedCoupon");
    const coupon = cart.appliedCoupon;

    if (
      coupon?.isActive &&
      new Date(coupon.expireDate) > new Date() &&
      coupon.usedCount < coupon.usageLimit
    ) {
      const discount =
        coupon.discountType === "percentage"
          ? (totalPrice * coupon.discount) / 100
          : coupon.discount;

      cart.discountAmount = Math.min(discount, totalPrice);
      cart.finalPrice = totalPrice - cart.discountAmount;
    } else {
      cart.appliedCoupon = null;
      cart.discountAmount = 0;
      cart.finalPrice = totalPrice;
    }
  } else {
    cart.discountAmount = 0;
    cart.finalPrice = totalPrice;
  }

  return cart;
};

// --- Controllers ---

export const addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;
  let { userId, sessionId } = getCartIdentifier(req);

  const product = await productModel.findById(productId);
  if (!product) return next(new AppError("Product not found", 404));

  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock. Only ${product.stock} items available`,
        400,
      ),
    );
  }

  // Generate a new sessionId for new guest users
  if (!userId && !sessionId) sessionId = generateSessionId();

  let cart = await findCart(userId, sessionId);

  if (!cart) {
    cart = await cartModel.create({
      userId,
      sessionId,
      items: [{ productId, quantity }],
    });
  } else {
    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId && !item.isDeleted,
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.stock < newQty) {
        return next(
          new AppError(
            `Cannot add more. Only ${product.stock - existingItem.quantity} items available`,
            400,
          ),
        );
      }
      existingItem.quantity = newQty;
    } else {
      cart.items.push({ productId, quantity });
    }
  }

  await recalcCart(cart);
  await cart.save();
  await cart.populate("items.productId");

  res.status(200).json({
    status: "success",
    sessionId,
    data: cart,
  });
});

export const getCart = catchAsync(async (req, res, next) => {
  const { userId, sessionId } = getCartIdentifier(req);

  const cart = await findCart(userId, sessionId);

  if (!cart) {
    return res.status(200).json({
      status: "success",
      data: { items: [], totalPrice: 0, discountAmount: 0, finalPrice: 0 },
    });
  }

  await cart.populate("items.productId");
  await cart.populate("appliedCoupon");

  const cartData = cart.toObject();
  cartData.items = cartData.items.filter((item) => !item.isDeleted);

  res.status(200).json({ status: "success", data: cartData });
});

export const updateQuantity = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;
  const { userId, sessionId } = getCartIdentifier(req);

  const cart = await findCart(userId, sessionId);
  if (!cart) return next(new AppError("Cart not found", 404));

  const item = cart.items.id(itemId);
  if (!item || item.isDeleted) {
    return next(new AppError("Item not found in cart", 404));
  }

  const product = await productModel.findById(item.productId);
  if (!product) return next(new AppError("Product not found", 404));

  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock. Only ${product.stock} items available`,
        400,
      ),
    );
  }

  item.quantity = quantity;

  await recalcCart(cart);
  await cart.save();
  await cart.populate("items.productId");

  res.status(200).json({ status: "success", data: cart });
});

export const removeFromCart = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { userId, sessionId } = getCartIdentifier(req);

  const cart = await findCart(userId, sessionId);
  if (!cart) return next(new AppError("Cart not found", 404));

  const item = cart.items.find(
    (i) => i.productId.toString() === productId && !i.isDeleted,
  );
  if (!item) return next(new AppError("Item not found in cart", 404));

  item.isDeleted = true;

  await recalcCart(cart);
  await cart.save();
  await cart.populate("items.productId");

  res.status(200).json({
    status: "success",
    message: "Item removed from cart",
    data: cart,
  });
});

export const clearCart = catchAsync(async (req, res, next) => {
  const { userId, sessionId } = getCartIdentifier(req);

  const cart = await findCart(userId, sessionId);
  if (!cart) return next(new AppError("Cart not found", 404));

  cart.isDeleted = true;
  await cart.save();

  res.status(200).json({
    status: "success",
    message: "Cart cleared successfully",
  });
});

export const applyCoupon = catchAsync(async (req, res, next) => {
  const { couponCode } = req.body;
  const { userId, sessionId } = getCartIdentifier(req);

  const cart = await findCart(userId, sessionId);
  if (!cart) return next(new AppError("Cart not found", 404));

  const coupon = await couponModel.findOne({
    code: couponCode.toUpperCase(),
    isActive: true,
  });
  if (!coupon) return next(new AppError("Invalid or inactive coupon code", 404));

  if (new Date(coupon.expireDate) < new Date()) {
    return next(new AppError("This coupon has expired", 400));
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    return next(new AppError("This coupon has reached its usage limit", 400));
  }

  cart.appliedCoupon = coupon._id;

  await recalcCart(cart);
  await cart.save();
  await cart.populate("items.productId");
  await cart.populate("appliedCoupon");

  res.status(200).json({
    status: "success",
    message: "Coupon applied successfully",
    data: cart,
  });
});

export const removeCoupon = catchAsync(async (req, res, next) => {
  const { userId, sessionId } = getCartIdentifier(req);

  const cart = await findCart(userId, sessionId);
  if (!cart) return next(new AppError("Cart not found", 404));

  cart.appliedCoupon = null;

  await recalcCart(cart);
  await cart.save();
  await cart.populate("items.productId");

  res.status(200).json({
    status: "success",
    message: "Coupon removed successfully",
    data: cart,
  });
});

// Merge guest cart into user cart (called after login)
export const mergeGuestCart = async (userId, sessionId) => {
  if (!sessionId) return;

  const guestCart = await cartModel.findOne({ sessionId, isDeleted: false });
  if (!guestCart) return;

  let userCart = await cartModel.findOne({ userId, isDeleted: false });

  if (userCart) {
    for (const guestItem of guestCart.items) {
      if (guestItem.isDeleted) continue;

      const existingItem = userCart.items.find(
        (item) =>
          item.productId.toString() === guestItem.productId.toString() &&
          !item.isDeleted,
      );

      if (existingItem) {
        const product = await productModel.findById(guestItem.productId);
        if (product) {
          existingItem.quantity = Math.min(
            existingItem.quantity + guestItem.quantity,
            product.stock,
          );
        }
      } else {
        userCart.items.push({
          productId: guestItem.productId,
          quantity: guestItem.quantity,
        });
      }
    }

    await recalcCart(userCart);
    await userCart.save();

    guestCart.isDeleted = true;
    await guestCart.save();
  } else {
    // Convert guest cart to user cart
    guestCart.userId = userId;
    guestCart.sessionId = null;
    await guestCart.save();
  }
};
