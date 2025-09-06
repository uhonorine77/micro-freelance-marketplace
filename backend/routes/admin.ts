// src/routes/admin.ts
import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse, AuthRequest, AdminStatsData, User, TaskWithClient } from '../types';

const router = express.Router();

export const createAdminRouter = (prisma: PrismaClient) => {
  
  router.get('/stats', async (req: AuthRequest, res: Response<ApiResponse<AdminStatsData>>): Promise<void> => {
    try {
      const totalUsers = await prisma.user.count();
      const totalTasks = await prisma.task.count();
      const totalBids = await prisma.bid.count();
      const openTasks = await prisma.task.count({ where: { status: 'open' } });
      const completedTasks = await prisma.task.count({ where: { status: 'completed' } });

      const stats: AdminStatsData = { totalUsers, totalTasks, totalBids, openTasks, completedTasks };
      res.json({ success: true, data: stats });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch admin stats';
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  router.get('/users', async (req: AuthRequest, res: Response<ApiResponse<User[]>>): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true, isVerified: true, createdAt: true, updatedAt: true,
        },
      });
      res.json({ success: true, data: users as unknown as User[] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
      res.status(500).json({ success: false, error: errorMessage });
    }
  });
  
  router.delete('/users/:id', async (req: AuthRequest<{ id: string }>, res: Response<ApiResponse<null>>): Promise<void> => {
    try {
        const { id } = req.params;
        if (id === req.user?.id) {
            res.status(400).json({ success: false, error: "Admins cannot delete their own account." });
            return;
        }

        const userToDelete = await prisma.user.findUnique({ where: { id } });
        if (!userToDelete) {
            res.status(404).json({ success: false, error: "User not found." });
            return;
        }
        
        // Use a transaction to safely delete a user and all their related records.
        // This is only needed if `onDelete: Cascade` is not set on the relations in schema.prisma.
        // With `onDelete: Cascade`, a simple `prisma.user.delete` is sufficient.
        await prisma.user.delete({ where: { id } });

        res.json({ success: true, message: `User ${userToDelete.email} and all their associated data have been deleted.` });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
        res.status(500).json({ success: false, error: errorMessage });
    }
  });

  router.get('/tasks', async (req: AuthRequest, res: Response<ApiResponse<TaskWithClient[]>>): Promise<void> => {
    try {
        const tasks = await prisma.task.findMany({
            orderBy: { createdAt: 'desc' },
            include: { client: { select: { id: true, firstName: true, lastName: true, email: true } } }
        });
        res.json({ success: true, data: tasks as unknown as TaskWithClient[] });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
        res.status(500).json({ success: false, error: errorMessage });
    }
  });

  router.delete('/tasks/:id', async (req: AuthRequest<{ id: string }>, res: Response<ApiResponse<null>>): Promise<void> => {
    try {
        const { id } = req.params;
        const taskToDelete = await prisma.task.findUnique({ where: { id } });
        if (!taskToDelete) {
            res.status(404).json({ success: false, error: "Task not found." });
            return;
        }
        
        // With `onDelete: Cascade` in the schema, just deleting the task is enough.
        await prisma.task.delete({ where: { id } });

        res.json({ success: true, message: `Task "${taskToDelete.title}" has been deleted.` });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
        res.status(500).json({ success: false, error: errorMessage });
    }
  });

  return router;
};