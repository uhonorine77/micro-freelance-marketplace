// src/routes/bids.ts
import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import {
  ApiResponse,
  CreateBidRequestBody,
  BidWithFreelancer,
  AuthRequest,
  TaskIdParams,
  Bid,
  TaskStatus,
  UserRole
} from '../types'; // No .js extension

const router = express.Router();

export const createBidsRouter = (prisma: PrismaClient) => {

  router.get('/task/:taskId', async (req: AuthRequest<TaskIdParams, ApiResponse<BidWithFreelancer[]>>, res: Response<ApiResponse<BidWithFreelancer[]>>): Promise<void> => {
    try {
      const { taskId } = req.params;
      const taskBids: BidWithFreelancer[] = await prisma.bid.findMany({
        where: { taskId },
        include: { freelancer: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });

      const response: ApiResponse<BidWithFreelancer[]> = {
        success: true,
        data: taskBids
      };
      res.json(response);
    } catch (error: unknown) {
      console.error('Failed to fetch bids:', error);
      const response: ApiResponse = {
        success: false,
        error: (error instanceof Error) ? error.message : 'Failed to fetch bids'
      };
      res.status(500).json(response);
    }
  });

  router.post('/',
    [
      body('taskId').isString().exists().withMessage('Task ID is required'),
      body('amount').isNumeric().toFloat().withMessage('Amount must be a number'),
      body('proposal').trim().isLength({ min: 10 }).withMessage('Proposal must be at least 10 characters long'),
      body('timeline').trim().isLength({ min: 1 }).withMessage('Timeline is required')
    ],
    async (req: AuthRequest<{}, ApiResponse<Bid>, CreateBidRequestBody>, res: Response<ApiResponse<Bid>>): Promise<void> => {
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

        const { taskId, amount, proposal, timeline } = req.body;

        if (!req.user || req.user.role !== UserRole.freelancer) {
          const response: ApiResponse = {
            success: false,
            error: 'Only freelancers can submit bids'
          };
          res.status(403).json(response);
          return;
        }

        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            const response: ApiResponse = { success: false, error: 'Task not found' };
            res.status(404).json(response);
            return;
        }
        if (task.status !== TaskStatus.open) {
            const response: ApiResponse = { success: false, error: 'Cannot bid on this task as it is not open' };
            res.status(400).json(response);
            return;
        }

        const bid: Bid = await prisma.bid.create({
          data: {
            taskId,
            freelancerId: req.user.id,
            amount: amount,
            proposal,
            timeline,
            status: 'pending',
          }
        });

        const response: ApiResponse<Bid> = {
          success: true,
          message: 'Bid submitted successfully',
          data: bid
        };

        res.status(201).json(response);
      } catch (error: unknown) {
        console.error('Failed to submit bid:', error);
        const response: ApiResponse = {
          success: false,
          error: (error instanceof Error) ? error.message : 'Failed to submit bid'
        };
        res.status(500).json(response);
      }
    }
  );

  return router;
};