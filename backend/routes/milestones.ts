// src/routes/milestones.ts
import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import {
  ApiResponse,
  CreateMilestoneRequestBody,
  AuthRequest,
  TaskIdParams,
  Milestone,
  UserRole
} from '../types'; // No .js extension

const router = express.Router();

export const createMilestonesRouter = (prisma: PrismaClient) => {

  router.get('/task/:taskId', async (req: AuthRequest<TaskIdParams, ApiResponse<Milestone[]>>, res: Response<ApiResponse<Milestone[]>>): Promise<void> => {
    try {
      const { taskId } = req.params;
      const taskMilestones: Milestone[] = await prisma.milestone.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' }
      });

      const response: ApiResponse<Milestone[]> = {
        success: true,
        data: taskMilestones
      };
      res.json(response);
    } catch (error: unknown) {
      console.error('Failed to fetch milestones:', error);
      const response: ApiResponse = {
        success: false,
        error: (error instanceof Error) ? error.message : 'Failed to fetch milestones'
      };
      res.status(500).json(response);
    }
  });

  router.post('/',
    [
      body('taskId').isString().exists().withMessage('Task ID is required'),
      body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
      body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
      body('amount').isNumeric().toFloat().withMessage('Amount must be a number'),
      body('dueDate').isISO8601().toDate().withMessage('Due date must be a valid ISO 8601 date')
    ],
    async (req: AuthRequest<{}, ApiResponse<Milestone>, CreateMilestoneRequestBody>, res: Response<ApiResponse<Milestone>>): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const response: ApiResponse = {
            success: false,
            error: 'Validation failed',
            data: errors.array()
          };
          res.status(400).json(response);
          return;
        }

        const { taskId, title, description, amount, dueDate } = req.body;

        if (!req.user || req.user.role !== UserRole.client) {
          const response: ApiResponse = { success: false, error: 'Only clients can create milestones' };
          res.status(403).json(response);
          return;
        }

        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task || task.clientId !== req.user.id) {
          const response: ApiResponse = {
            success: false,
            error: 'Unauthorized to create milestones for this task or task not found'
          };
          res.status(403).json(response);
          return;
        }

        const milestone: Milestone = await prisma.milestone.create({
          data: {
            taskId,
            title,
            description,
            amount: amount,
            dueDate: dueDate,
            status: 'pending',
          }
        });

        const response: ApiResponse<Milestone> = {
          success: true,
          message: 'Milestone created successfully',
          data: milestone
        };

        res.status(201).json(response);
      } catch (error: unknown) {
        console.error('Failed to create milestone:', error);
        const response: ApiResponse = {
          success: false,
          error: (error instanceof Error) ? error.message : 'Failed to create milestone'
        };
        res.status(500).json(response);
      }
    }
  );

  return router;
};