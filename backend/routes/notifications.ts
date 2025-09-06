// src/routes/notifications.ts
import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  ApiResponse,
  AuthRequest,
  NotificationIdParams,
  Notification
} from '../types'; // No .js extension

const router = express.Router();

export const createNotificationsRouter = (prisma: PrismaClient) => {

  router.get('/', async (req: AuthRequest<{}, ApiResponse<Notification[]>>, res: Response<ApiResponse<Notification[]>>): Promise<void> => {
    try {
      if (!req.user?.id) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const userNotifications: Notification[] = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });

      const response: ApiResponse<Notification[]> = {
        success: true,
        data: userNotifications
      };
      res.json(response);
    } catch (error: unknown) {
      console.error('Failed to fetch notifications:', error);
      const response: ApiResponse = {
        success: false,
        error: (error instanceof Error) ? error.message : 'Failed to fetch notifications'
      };
      res.status(500).json(response);
    }
  });

  router.patch('/:id/read', async (req: AuthRequest<NotificationIdParams, ApiResponse<null>>, res: Response<ApiResponse<null>>): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification || notification.userId !== req.user.id) {
        const response: ApiResponse = {
          success: false,
          error: 'Notification not found or unauthorized'
        };
        res.status(404).json(response);
        return;
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });

      const response: ApiResponse<null> = {
        success: true,
        message: 'Notification marked as read',
        data: null
      };
      res.json(response);
    } catch (error: unknown) {
      console.error('Failed to update notification:', error);
      const response: ApiResponse = {
        success: false,
        error: (error instanceof Error) ? error.message : 'Failed to update notification'
      };
      res.status(500).json(response);
    }
  });
  
  // New endpoint to mark all notifications as read
  router.patch('/read-all', async (req: AuthRequest, res: Response<ApiResponse<null>>): Promise<void> => {
    try {
      if (!req.user?.id) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true }
      });

      const response: ApiResponse<null> = {
        success: true,
        message: 'All notifications marked as read',
        data: null
      };
      res.json(response);
    } catch (error: unknown) {
      console.error('Failed to update notifications:', error);
      const response: ApiResponse = {
        success: false,
        error: (error instanceof Error) ? error.message : 'Failed to update notifications'
      };
      res.status(500).json(response);
    }
  });


  return router;
};