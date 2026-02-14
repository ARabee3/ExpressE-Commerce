import { userModel } from "../../Database/Models/user.model.js";
import { AppError } from "../../Utils/Error/AppError.js";
import { catchAsync } from "../../Utils/Error/catchAsync.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendMailEvent } from "../../Utils/Events/sendEmailEvent.js";

const register = catchAsync(async (req, res, next) => {
  const newUser = await userModel.create(req.body);
  sendMailEvent.emit("register", newUser);

  newUser.password = undefined;
  res.status(201).json({
    success: true,
    data: newUser,
  });
});

const login = catchAsync(async (req, res, next) => {
  const foundUser = await userModel
    .findOne({ email: req.body.email })
    .select("+password");

  if (!foundUser) {
    return next(new AppError("Invalid Email or Password", 401));
  }

  // if(!foundUser.isVerified){
  //   return next(new AppError("Please Confirm Your Email First",401))
  // }

  const match = await bcrypt.compare(req.body.password, foundUser.password);
  if (match) {
    let token = jwt.sign(
      {
        _id: foundUser._id,
        email: foundUser.email,
        role: foundUser.role,
      },
      process.env.SECRETKEY,
      { expiresIn: "1h" },
    );
    res.json({ success: true, data: token });
  } else {
    return next(new AppError("Email or Password Invalid", 401));
  }
});
export { register, login };
