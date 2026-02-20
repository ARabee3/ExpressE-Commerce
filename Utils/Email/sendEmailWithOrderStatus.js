import nodemailer from "nodemailer";
import "dotenv/config";
import { getStatusInfo, generateEmailHTML } from "./templateForStatusEmail.js";

export const sendOrderStatusEmail = async (
  userEmail,
  userName,
  orderId,
  status,
) => {
  const statusInfo = getStatusInfo(status);

  const senderMail = process.env.EMAIL;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: senderMail,
      pass: process.env.GOOGLE_APP_PASSWORD,
    },
  });

  try {
    const mailOptions = {
      from: `"E-Commerce Store" <${senderMail}>`,
      to: userEmail,
      subject: `${statusInfo.subject} - Order #${orderId}`,
      html: generateEmailHTML(userName, orderId, status, statusInfo),
    };

    await transporter.sendMail(mailOptions);
    console.log("Email Sent Successfully");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
