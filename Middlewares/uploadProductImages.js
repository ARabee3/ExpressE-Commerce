import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import { AppError } from "../Utils/Error/AppError.js";

// Determine if we are in production (Vercel) or development
const isProduction = process.env.NODE_ENV === 'production';

// Use /tmp in production (Vercel read-only filesystem workaround), or 'uploads/products' locally
const uploadpath = isProduction ? os.tmpdir() : "uploads/products";

//storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Ensure directory exists lazily
        if (!fs.existsSync(uploadpath)) {
            try {
                fs.mkdirSync(uploadpath, { recursive: true });
            } catch (error) {
                // Only log if it's not EEXIST (which is fine, just a race condition)
                if (error.code !== 'EEXIST') {
                    console.error("Failed to create upload directory:", error);
                    // Pass error to callback if we can't ensure directory exists
                    // cb(error); // Ideally we should stop here if strict, but let's try to proceed or just log.
                    // If we can't write, multer will fail later anyway.
                }
            }
        }
        cb(null, uploadpath);
    },
    filename: function(req,file, cb) {
        const uniquName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniquName + path.extname(file.originalname));
    },
})
//filter only images
const fileFilter = (req, file, cb) => {
    if(file.mimetype.startsWith("image")) {
        cb(null, true);
    }else {
        cb(new AppError("only images are allowed"), false);
    }
};
const upload = multer({
    storage,
    fileFilter,
})
export const uploadProductImages = upload.array(
  "images", // field name
  5 // max images
);