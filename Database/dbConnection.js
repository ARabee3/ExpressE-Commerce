import mongoose from "mongoose";
import "dotenv/config";

export const dbConnection = () => {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected To Database"))
    .catch((err) => console.log(err));
};
