import express from "express";
import { handleChat } from "./chatbot.controller.js";
import { verifyToken } from "../../Middlewares/verifyToken.js";

const chatbotRoutes = express.Router();

chatbotRoutes.post("/chat", verifyToken, handleChat);

export default chatbotRoutes;
