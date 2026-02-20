import nodemailer from "nodemailer";
import "dotenv/config";
import otpGenerator from "otp-generator";
import { redisClient } from "../../Database/redisConnection.js";

export const sendEmail = async (user) => {
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

    await redisClient.set(user.email, otp, {
      EX: 300,
    });

    const mailOptions = {
      from: `"E-Commerce" <${process.env.EMAIL}>`,
      to: user.email,
      subject: "Your Verification Code",
      html: `
      <div style="font-family: Helvetica, Arial, sans-serif; min-width:1000px; overflow:auto; line-height:2">
        <div style="margin:50px auto; width:70%; padding:20px 0">
          <p style="font-size:1.1em">Hi ${user.name || ""},</p>
          <p>Use the following OTP to complete your login procedures. OTP is valid for 5 minutes.</p>
          <h2 style="background: #00466a; margin: 0 auto; width: max-content; padding: 0 10px; color: #fff; border-radius: 4px;">
            ${otp}
          </h2>
        </div>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email Sent Successfully");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
