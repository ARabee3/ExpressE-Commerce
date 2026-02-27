import multer from "multer";
import path from "path";
import fs from "fs";
import { AppError } from "../Utils/Error/AppError.js";

//ensure folder exist
const uploadpath = "uploads/products";

if(!fs.existsSync(uploadpath)){
    fs.mkdirSync(uploadpath, { recursive: true});
}
//storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
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