import { EventEmitter } from "events";
import { sendEmail } from "../Email/sendEmail.js";

export const sendMailEvent = new EventEmitter();

sendMailEvent.on("register", async (user) => {
  await sendEmail(user, "Verify your account.", "verify");
});

sendMailEvent.on("forgot-password", async (user) => {
  await sendEmail(user, "Password Reset Code", "reset");
});
