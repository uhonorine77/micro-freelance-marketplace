// src/routes/tasks.ts
import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import {
  ApiResponse,
  CreateTaskRequestBody,
  AuthRequest,
  TaskWithClient,
  Task,
  TaskCategory,
  BudgetType,
  UserRole
} from '../types'; // No .js extension

const router = express.Router();

export const createTasksRouter = (prisma: PrismaClient) => {

  router.get('/', async (_req: AuthRequest<{}, ApiResponse<TaskWithClient[]>>, res: Response<ApiResponse<TaskWithClient[]>>): Promise<void> => {
    try {
      const tasks: TaskWithClient[] = await prisma.task.findMany({
        include: { client: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });

      const response: ApiResponse<TaskWithClient[]> = {
        success: true,
        data: tasks
      };
      res.json(response);
    } catch (error: unknown) {
      console.error('Failed to fetch tasks:', error);
      const response: ApiResponse = {
        success: false,
        error: (error instanceof Error) ? error.message : 'Failed to fetch tasks'
      };
      res.status(500).json(response);
    }
  });


  router.get('/:id', async (req: AuthRequest<{ id: string }>, res: Response<ApiResponse<TaskWithClient>>): Promise<void> => {
    try {
      const { id } = req.params;

      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          // We include the related client and select only the public fields
          // This matches the `TaskWithClient` type the frontend expects.
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }

      // Send the task with the client's public profile included
      res.json({ success: true, data: task });
    } catch (error: unknown) {
      console.error(`Failed to fetch task with ID ${req.params.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch task';
      res.status(500).json({ success: false, error: errorMessage });
    }
  });




  router.post('/',
    [
      body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
      body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
      body('category').isIn(Object.values(TaskCategory)).withMessage(`Category must be one of: ${Object.values(TaskCategory).join(', ')}`),
      body('budget').isNumeric().toFloat().withMessage('Budget must be a number'),
      body('budgetType').isIn(Object.values(BudgetType)).withMessage(`Budget type must be one of: ${Object.values(BudgetType).join(', ')}`),
      body('deadline').isISO8601().toDate().withMessage('Deadline must be a valid ISO 8601 date')
    ],
    async (req: AuthRequest<{}, ApiResponse<Task>, CreateTaskRequestBody>, res: Response<ApiResponse<Task>>): Promise<void> => {
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

        if (!req.user || req.user.role !== UserRole.client) {
          const response: ApiResponse = {
            success: false,
            error: 'Only clients can create tasks'
          };
          res.status(403).json(response);
          return;
        }

        const { title, description, category, budget, budgetType, deadline } = req.body;

        const task: Task = await prisma.task.create({
          data: {
            title,
            description,
            category,
            budget: budget,
            budgetType,
            deadline: deadline,
            status: 'open',
            clientId: req.user.id,
          }
        });

        const response: ApiResponse<Task> = {
          success: true,
          message: 'Task created successfully',
          data: task
        };

        res.status(201).json(response);
      } catch (error: unknown) {
        console.error('Failed to create task:', error);
        const response: ApiResponse = {
          success: false,
          error: (error instanceof Error) ? error.message : 'Failed to create task'
        };
        res.status(500).json(response);
      }
    }
  );

  return router;
};