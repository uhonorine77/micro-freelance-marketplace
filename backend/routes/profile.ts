// backend/routes/profile.ts
import express, { Response, Request } from "express";
import { body, ValidationError, validationResult } from "express-validator";
import { PrismaClient } from "@prisma/client";
import { ApiResponse, AuthRequest, User } from "../types";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// --- Multer Configuration for File Storage ---
const uploadDir = path.join(__dirname, "../public/uploads/avatars");

// Ensure the directory exists
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const user = (req as AuthRequest).user;
    if (!user) {
      return cb(new Error("User not authenticated for upload"), "");
    }
    const uniqueSuffix = `${user.id}-${Date.now()}`;
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const createProfileRouter = (prisma: PrismaClient) => {
  // --- GET /api/profile ---
  router.get(
    "/",
    async (req: AuthRequest, res: Response<ApiResponse<User>>) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({
            success: false,
            error: "User not authenticated",
          });
        }

        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,
            avatarUrl: true,
            portfolioUrl: true,
            githubUrl: true,
            linkedinUrl: true,
          },
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            error: "User not found",
          });
        }

        res.json({ success: true, data: user as unknown as User });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch profile";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  // --- PUT /api/profile ---
  router.put(
    "/",
    [
      body("firstName")
        .trim()
        .isLength({ min: 1 })
        .withMessage("First name is required"),
      body("lastName")
        .trim()
        .isLength({ min: 1 })
        .withMessage("Last name is required"),
      body("portfolioUrl")
        .optional({ checkFalsy: true })
        .isURL()
        .withMessage("Please enter a valid URL for your portfolio."),
      body("githubUrl")
        .optional({ checkFalsy: true })
        .isURL()
        .withMessage("Please enter a valid URL for GitHub."),
      body("linkedinUrl")
        .optional({ checkFalsy: true })
        .isURL()
        .withMessage("Please enter a valid URL for LinkedIn."),
    ],
    async (
      req: AuthRequest,
      res: Response<ApiResponse<User | ValidationError[]>>
    ) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          data: errors.array(),
        });
      }

      try {
        if (!req.user?.id) {
          return res.status(401).json({
            success: false,
            error: "User not authenticated",
          });
        }

        const { firstName, lastName, portfolioUrl, githubUrl, linkedinUrl } =
          req.body;

        const updatedUser = await prisma.user.update({
          where: { id: req.user.id },
          data: { firstName, lastName, portfolioUrl, githubUrl, linkedinUrl },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isVerified: true,
            avatarUrl: true,
            portfolioUrl: true,
            githubUrl: true,
            linkedinUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        res.json({
          success: true,
          message: "Profile updated successfully",
          data: updatedUser as unknown as User,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update profile";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  // --- POST /api/profile/picture ---
router.post(
  "/picture",
  upload.single("avatar"),
  async (
    req: AuthRequest,
    res: Response<ApiResponse<{ avatarUrl: string }>>
  ) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      // Build full URL instead of relative path
      const fullUrl = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;

      await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl: fullUrl },
      });

      res.json({
        success: true,
        message: "Profile picture updated successfully!",
        data: { avatarUrl: fullUrl },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      res.status(500).json({ success: false, error: errorMessage });
    }
  }
);


  return router;
};
