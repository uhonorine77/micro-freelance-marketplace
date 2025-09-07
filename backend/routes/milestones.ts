// backend/routes/milestones.ts
import express, { Response } from "express";
import { body, ValidationError, validationResult } from "express-validator";
import {
  PrismaClient,
  TaskStatus,
  MilestoneStatus,
  UserRole,
} from "@prisma/client";
import {
  ApiResponse,
  CreateMilestoneRequestBody,
  AuthRequest,
  TaskIdParams,
  Milestone,
} from "../types";
import { getSocketIoInstance } from "../socket";

const router = express.Router();

export const createMilestonesRouter = (prisma: PrismaClient) => {
  // GET /api/milestones/task/:taskId - Fetch all milestones for a task
  router.get(
    "/task/:taskId",
    async (
      req: AuthRequest<TaskIdParams, ApiResponse<Milestone[]>>,
      res: Response<ApiResponse<Milestone[]>>
    ) => {
      try {
        const { taskId } = req.params;
        const taskMilestones: Milestone[] = await prisma.milestone.findMany({
          where: { taskId },
          orderBy: { createdAt: "asc" },
        });
        res.json({ success: true, data: taskMilestones });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch milestones";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  // POST /api/milestones - Create a new milestone for a task
  router.post(
    "/",
    [
      body("taskId").isUUID().withMessage("Valid Task ID is required"),
      body("title")
        .trim()
        .isLength({ min: 5 })
        .withMessage("Title must be at least 5 characters long"),
      body("description")
        .trim()
        .isLength({ min: 10 })
        .withMessage("Description must be at least 10 characters long"),
      body("amount")
        .isFloat({ gt: 0 })
        .withMessage("Amount must be a positive number"),
      body("dueDate")
        .isISO8601()
        .toDate()
        .withMessage("Due date must be a valid ISO 8601 date"),
    ],
    async (
      req: AuthRequest<{}, ApiResponse<Milestone>, CreateMilestoneRequestBody>,
      res: Response<ApiResponse<Milestone | ValidationError[]>>
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
        if (!req.user || req.user.role !== UserRole.client) {
          return res.status(403).json({
            success: false,
            error: "Only clients can create milestones.",
          });
        }

        const { taskId, title, description, amount, dueDate } = req.body;
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { bids: { where: { status: "accepted" } } },
        });

        if (!task || task.clientId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized to create milestones for this task.",
          });
        }

        const newMilestone = await prisma.milestone.create({
          data: {
            taskId,
            title,
            description,
            amount,
            dueDate,
            status: MilestoneStatus.pending,
          },
        });

        // Notify the assigned freelancer, if one exists
        if (task.bids.length > 0) {
          const freelancerId = task.bids[0].freelancerId;
          const notificationMessage = `A new milestone "${title}" was added to your project "${task.title}".`;
          const notification = await prisma.notification.create({
            data: { userId: freelancerId, message: notificationMessage },
          });
          getSocketIoInstance()
            .to(`user_${freelancerId}`)
            .emit("new_notification", notification);
        }

        res.status(201).json({
          success: true,
          message: "Milestone created successfully",
          data: newMilestone,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create milestone.";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  // PATCH /api/milestones/:milestoneId/complete - Freelancer requests completion
  router.patch(
    "/:milestoneId/complete",
    async (
      req: AuthRequest<{ milestoneId: string }>,
      res: Response<ApiResponse>
    ) => {
      try {
        const { milestoneId } = req.params;
        const freelancerId = req.user?.id;

        const milestone = await prisma.milestone.findUnique({
          where: { id: milestoneId },
          include: {
            task: { include: { bids: { where: { status: "accepted" } } } },
          },
        });

        if (!milestone)
          return res
            .status(404)
            .json({ success: false, error: "Milestone not found." });

        const assignedFreelancerId = milestone.task.bids[0]?.freelancerId;
        if (!assignedFreelancerId || assignedFreelancerId !== freelancerId) {
          return res.status(403).json({
            success: false,
            error: "You are not authorized to modify this milestone.",
          });
        }

        if (milestone.status !== MilestoneStatus.pending) {
          return res.status(400).json({
            success: false,
            error: `Milestone is already ${milestone.status}.`,
          });
        }

        const updatedMilestone = await prisma.milestone.update({
          where: { id: milestoneId },
          data: { status: MilestoneStatus.completed },
        });

        const notificationMessage = `${req.user?.email} has marked milestone "${milestone.title}" as complete. Please review and release payment.`;
        const notification = await prisma.notification.create({
          data: {
            userId: milestone.task.clientId,
            message: notificationMessage,
          },
        });
        getSocketIoInstance()
          .to(`user_${milestone.task.clientId}`)
          .emit("new_notification", notification);

        res.json({
          success: true,
          message: "Milestone marked as complete.",
          data: updatedMilestone,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update milestone.";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  // PATCH /api/milestones/:milestoneId/release-payment - Client releases payment
  router.patch(
    "/:milestoneId/release-payment",
    async (
      req: AuthRequest<{ milestoneId: string }>,
      res: Response<ApiResponse>
    ) => {
      try {
        const { milestoneId } = req.params;
        const clientId = req.user?.id;

        const milestone = await prisma.milestone.findUnique({
          where: { id: milestoneId },
          include: {
            task: { include: { bids: { where: { status: "accepted" } } } },
          },
        });

        if (!milestone)
          return res
            .status(404)
            .json({ success: false, error: "Milestone not found." });

        if (milestone.task.clientId !== clientId) {
          return res.status(403).json({
            success: false,
            error:
              "You are not authorized to release payment for this milestone.",
          });
        }

        if (milestone.status !== MilestoneStatus.completed) {
          return res.status(400).json({
            success: false,
            error:
              "This milestone must be marked as complete before releasing payment.",
          });
        }

        // --- TRANSACTION FOR PAYMENT AND POTENTIAL TASK COMPLETION ---
        const [updatedMilestone] = await prisma.$transaction(async (tx) => {
          // 1. Update milestone to PAID
          const paidMilestone = await tx.milestone.update({
            where: { id: milestoneId },
            data: { status: MilestoneStatus.paid },
          });

          // 2. Check if all other milestones are also paid to complete the task
          const remainingMilestones = await tx.milestone.count({
            where: {
              taskId: milestone.taskId,
              status: { not: MilestoneStatus.paid },
            },
          });

          if (remainingMilestones === 0) {
            await tx.task.update({
              where: { id: milestone.taskId },
              data: { status: TaskStatus.completed },
            });
          } else if (milestone.task.status === TaskStatus.assigned) {
            // Auto-transition task to in_progress on first payment
            await tx.task.update({
              where: { id: milestone.taskId },
              data: { status: TaskStatus.in_progress },
            });
          }

          return [paidMilestone];
        });

        const freelancerId = milestone.task.bids[0].freelancerId;
        const notificationMessage = `Payment for milestone "${milestone.title}" has been released by the client.`;
        const notification = await prisma.notification.create({
          data: { userId: freelancerId, message: notificationMessage },
        });
        getSocketIoInstance()
          .to(`user_${freelancerId}`)
          .emit("new_notification", notification);

        res.json({
          success: true,
          message: "Payment released successfully.",
          data: updatedMilestone,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to release payment.";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  return router;
};
