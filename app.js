import express from "express";
import "dotenv/config";
import { dbConnection } from "./Database/dbConnection.js";
import { globalErrorHandler } from "./Middlewares/globalErrorHandler.js";
dbConnection();
const app = express();

app.use(express.json());

app.use(globalErrorHandler);

app.listen(3000, () => {
  console.log("Server is running successfully at port 3000");
});
