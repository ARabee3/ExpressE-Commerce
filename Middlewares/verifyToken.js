import jwt from "jsonwebtoken";
import { userModel } from "../Database/Models/user.model.js";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided. Please sign in.",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.SECRETKEY);
    const user = await userModel.findById(decoded._id);
    if (!user || user.isDeleted)
      return res.status(404).json({
        success: false,
        message: "User is deleted or banned.",
      });
    req.user = user;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Expired", // Frontend looks for this to trigger refresh logic
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

// Optional auth: sets req.user if token is present, but doesn't block guests
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // No token — continue as guest
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRETKEY);
    req.user = decoded;
  } catch (err) {
    // Invalid/expired token — continue as guest
  }

  next();
};

export { verifyToken, optionalAuth };
export default verifyToken;
