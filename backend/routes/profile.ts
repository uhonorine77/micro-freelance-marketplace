// src/routes/profile.ts
import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { ApiResponse, AuthRequest, User } from '../types';
import multer from 'multer';

const router = express.Router();

const storage = multer.memoryStorage(); // Temporary storage
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

export const createProfileRouter = (prisma: PrismaClient) => {

  // GET /api/profile - Fetch the current user's profile
  router.get('/', async (req: AuthRequest, res: Response<ApiResponse<User>>): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        // Ensure we don't send the password hash
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          tasks: false,
          bids: false,
          notifications: false,
          messages: false,
        }
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // We explicitly cast here after selecting fields to match the User type
      const response: ApiResponse<User> = {
        success: true,
        data: user as unknown as User
      };
      res.json(response);

    } catch (error: unknown) {
      console.error('Failed to fetch profile:', error);
      const response: ApiResponse = {
        success: false,
        error: (error instanceof Error) ? error.message : 'Failed to fetch profile'
      };
      res.status(500).json(response);
    }
  });

  // PUT /api/profile - Update the current user's profile
  router.put('/',
    [
      body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
      body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
    ],
    async (req: AuthRequest, res: Response<ApiResponse<User>>): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
          return;
        }

        if (!req.user?.id) {
          res.status(401).json({ success: false, error: 'User not authenticated' });
          return;
        }

        const { firstName, lastName } = req.body;

        const updatedUser = await prisma.user.update({
          where: { id: req.user.id },
          data: { firstName, lastName },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,
          }
        });

        const response: ApiResponse<User> = {
          success: true,
          message: 'Profile updated successfully',
          data: updatedUser as unknown as User
        };
        res.json(response);

      } catch (error: unknown) {
        console.error('Failed to update profile:', error);
        const response: ApiResponse = {
          success: false,
          error: (error instanceof Error) ? error.message : 'Failed to update profile'
        };
        res.status(500).json(response);
      }
    }
  );

  // POST /api/profile/picture - Upload a new profile picture
  router.post('/picture', upload.single('avatar'), async (req: AuthRequest, res: Response<ApiResponse<{ avatarUrl: string }>>) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }
      // =======================================================================
      // MOCK UPLOAD LOGIC - REPLACE WITH YOUR CLOUD STORAGE SERVICE
      // 1. Initialize your cloud storage client (e.g., S3, Cloudinary).
      // 2. Upload `req.file.buffer` to your storage bucket.
      // 3. The upload will return a public URL for the file.
      //
      // Example with a placeholder function:
      // const fileUrl = await uploadToCloudStorage(req.file.buffer, req.file.mimetype);
      // =======================================================================
      
      // For now, we will simulate this by creating a fake URL.
      // IN A REAL APP, `fileUrl` would come from your storage service.
      const fileUrl = `https://fake-storage.com/avatars/${req.user.id}-${Date.now()}.jpg`;
      console.log(`(Mock) Uploaded file for user ${req.user.id} to ${fileUrl}`);

      // Update the user's record in the database with the new URL
      await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl: fileUrl },
      });

      res.json({ success: true, message: "Profile picture updated!", data: { avatarUrl: fileUrl } });

    } catch (error: unknown) {
      console.error('Failed to upload profile picture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  return router;
};