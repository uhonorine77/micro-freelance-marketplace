// backend/routes/auth.ts
import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { PrismaClient } from "@prisma/client";
import {
  ApiResponse,
  RegisterRequestBody,
  LoginRequestBody,
  AuthResponseData,
  JwtPayload,
  UserRole,
} from "../types";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service";
import {
  createVerificationToken,
  createPasswordResetToken,
  verifyToken,
} from "../services/token.service";

const router = express.Router();

export const createAuthRouter = (prisma: PrismaClient) => {
  // --- USER REGISTRATION ---
  router.post(
    "/register",
    [
      body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Invalid email address"),
      body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long"),
      body("firstName")
        .trim()
        .isLength({ min: 1 })
        .withMessage("First name is required"),
      body("lastName")
        .trim()
        .isLength({ min: 1 })
        .withMessage("Last name is required"),
      body("role")
        .isIn(Object.values(UserRole))
        .withMessage(
          `Role must be one of: ${Object.values(UserRole).join(", ")}`
        ),
    ],
    async (req: Request, res: Response<ApiResponse>) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Validation failed",
            data: errors.array(),
          });
      }
      try {
        const { email, password, firstName, lastName, role } =
          req.body as RegisterRequestBody;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          return res
            .status(409)
            .json({
              success: false,
              error: "An account with this email already exists.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
          data: { email, password: hashedPassword, firstName, lastName, role },
        });

        const verificationToken = createVerificationToken(user);
        await sendVerificationEmail(user, verificationToken);

        res
          .status(201)
          .json({
            success: true,
            message:
              "Registration successful. Please check your email to verify your account.",
          });
      } catch (error) {
        console.error("Registration error:", error);
        res
          .status(500)
          .json({
            success: false,
            error: "Registration failed due to a server error.",
          });
      }
    }
  );

  // --- EMAIL VERIFICATION ---
  router.get(
    "/verify-email/:token",
    async (req: Request, res: Response<ApiResponse>) => {
      try {
        const { token } = req.params;
        const decoded = verifyToken(token, "VERIFY_EMAIL");

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });
        if (!user) {
          return res
            .status(400)
            .json({ success: false, error: "User not found for this token." });
        }

        if (user.isVerified) {
          return res.json({
            success: true,
            message: "This account has already been verified. You can log in.",
          });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true },
        });
        res.json({ success: true, message: "Email verified successfully." });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        res.status(400).json({ success: false, error: errorMessage });
      }
    }
  );

  // --- RESEND VERIFICATION EMAIL ---
  router.post(
    "/resend-verification",
    [body("email").isEmail().normalizeEmail()],
    async (req: Request, res: Response<ApiResponse>) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid email address." });
      }
      try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || user.isVerified) {
          // Always send a generic success response to prevent email enumeration attacks
          return res.json({
            success: true,
            message:
              "If an account with that email exists and is unverified, a new link has been sent.",
          });
        }

        const verificationToken = createVerificationToken(user);
        await sendVerificationEmail(user, verificationToken);
        res.json({
          success: true,
          message: "A new verification email has been sent.",
        });
      } catch (error) {
        console.error("Resend verification error:", error);
        res
          .status(500)
          .json({
            success: false,
            error: "Failed to resend verification email.",
          });
      }
    }
  );

  // --- USER LOGIN ---
  router.post(
    "/login",
    [
      body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Invalid email address"),
      body("password").exists().withMessage("Password is required"),
    ],
    async (req: Request, res: Response<ApiResponse>) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Validation failed",
            data: errors.array(),
          });
      }
      try {
        const { email, password } = req.body as LoginRequestBody;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return res
            .status(401)
            .json({ success: false, error: "Invalid credentials" });
        }
        if (!user.isVerified) {
          return res
            .status(403)
            .json({
              success: false,
              error:
                "Email not verified. Please check your inbox for a verification link.",
              data: { notVerified: true },
            });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res
            .status(401)
            .json({ success: false, error: "Invalid credentials" });
        }
        const jwtPayload: JwtPayload = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
        const token: string = jwt.sign(
          jwtPayload,
          process.env.JWT_SECRET as string,
          { expiresIn: "7d" }
        );

        const responseData: AuthResponseData = {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isVerified: user.isVerified,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
        };
        res.json({
          success: true,
          message: "Login successful",
          data: responseData,
        });
      } catch (error) {
        console.error("Login error:", error);
        res
          .status(500)
          .json({
            success: false,
            error: "Login failed due to a server error.",
          });
      }
    }
  );

  // --- FORGOT PASSWORD ---
  router.post(
    "/forgot-password",
    [body("email").isEmail().normalizeEmail()],
    async (req: Request, res: Response<ApiResponse>) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid email address provided." });
      }
      try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          const resetToken = createPasswordResetToken(user);
          await sendPasswordResetEmail(user, resetToken);
        }
        res.json({
          success: true,
          message:
            "If an account with this email exists, a password reset link has been sent.",
        });
      } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ success: false, error: "An error occurred." });
      }
    }
  );

  // --- RESET PASSWORD ---
  router.post(
    "/reset-password/:token",
    [
      body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long"),
    ],
    async (req: Request, res: Response<ApiResponse>) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Validation failed",
            data: errors.array(),
          });
      }
      try {
        const { token } = req.params;
        const { password } = req.body;

        const decoded = verifyToken(token, "RESET_PASSWORD");

        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { password: hashedPassword },
        });
        res.json({
          success: true,
          message: "Password has been reset successfully. You can now log in.",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        res.status(400).json({ success: false, error: errorMessage });
      }
    }
  );

  return router;
};
