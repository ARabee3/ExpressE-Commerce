import nodemailer from "nodemailer";
import "dotenv/config";
import otpGenerator from "otp-generator";
import { redisClient } from "../../Database/redisConnection.js";
import logger from "../logger.js";

export const sendEmail = async (user, subject, messageType) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.GOOGLE_APP_PASSWORD,
    },
  });

  try {
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    const redisKey = `${messageType}:${user.email}`;
    await redisClient.set(redisKey, otp, { EX: 300 });

    const textContent =
      messageType === "verify"
        ? "Use the following OTP to verify your account."
        : "Use the following OTP to reset your password.";

    const mailOptions = {
      from: `"E-Commerce" <${process.env.EMAIL}>`,
      to: user.email,
      subject: subject,
      html: `
      <div style="font-family: Arial, sans-serif; padding:20px;">
          <p>Hi ${user.name || "User"},</p>
          <p>${textContent} It is valid for 5 minutes.</p>
          <h2 style="background: #00466a; width: max-content; padding: 10px; color: #fff; border-radius: 4px;">
            ${otp}
          </h2>
      </div>`,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    logger.error({ err: error, email: user.email }, "Failed to send email");
    return false;
  }
};
