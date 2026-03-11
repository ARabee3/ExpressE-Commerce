import multer from "multer";
import { AppError } from "../Utils/Error/AppError.js";

// Use memory storage – files stay as buffers, then we upload to Cloudinary
const storage = multer.memoryStorage();

// Allow images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Only images are allowed", 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
});

export const uploadProductImages = upload.array(
  "images", // field name
  5, // max images
);
