import { EventEmitter } from "events";
import { sendEmail } from "../Email/sendEmail.js";

export const sendMailEvent = new EventEmitter();

sendMailEvent.on("register", async (user) => {
  await sendEmail(user);
});
