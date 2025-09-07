import nodemailer from "nodemailer";
import { User } from "@prisma/client";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // 🔑 Fix self-signed cert error
  },
});

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"FreelanceHub" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent: ${info.messageId}`);

    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    console.error("Error sending email:", error);

    throw new Error("Failed to send email.");
  }
};

export const sendVerificationEmail = async (user: User, token: string) => {
  const verificationLink = `${process.env.CLIENT_URL}/verify-email/${token}`;
  const subject = "Verify Your Email Address for FreelanceHub";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Welcome to FreelanceHub, ${user.firstName}!</h2>
      <p>Thank you for registering. Please click the button below to verify your email address and activate your account.</p>
      <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
      <p>If you cannot click the button, please copy and paste this link into your browser:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
      <p>This link will expire in 1 hour.</p>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p>If you did not create an account, no further action is required.</p>
    </div>
  `;
  await sendEmail(user.email, subject, html);
};

export const sendPasswordResetEmail = async (user: User, token: string) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;
  const subject = "Your FreelanceHub Password Reset Request";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Hello ${user.firstName},</h2>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
      <p>If you cannot click the button, please copy and paste this link into your browser:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link will expire in 10 minutes.</p>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;
  await sendEmail(user.email, subject, html);
};
