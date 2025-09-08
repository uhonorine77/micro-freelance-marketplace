// backend/routes/bids.ts
import express, { Response } from "express";
import { body, ValidationError, validationResult } from "express-validator";
import { PrismaClient } from "@prisma/client";
import {
  ApiResponse,
  CreateBidRequestBody,
  BidWithFreelancer,
  AuthRequest,
  TaskIdParams,
  Bid,
  TaskStatus,
  UserRole,
  BidStatus,
} from "../types";
import { getSocketIoInstance } from "../socket";

const router = express.Router();

export const createBidsRouter = (prisma: PrismaClient) => {
   // GET /api/bids/my-bids - Fetch all bids for the current freelancer
   router.get(
    "/my-bids",
    async (req: AuthRequest, res: Response<ApiResponse<BidWithFreelancer[]>>) => {
      try {
        if (!req.user || req.user.role !== UserRole.freelancer) {
          return res.status(403).json({ success: false, error: "Access denied." });
        }

        const myBids = await prisma.bid.findMany({
          where: { freelancerId: req.user.id },
          include: {
            task: { // Include task details with each bid
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        res.json({ success: true, data: myBids as any });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch your bids";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  // GET /api/bids/task/:taskId - Fetch all bids for a specific task
  router.get(
    "/task/:taskId",
    async (
      req: AuthRequest<TaskIdParams, ApiResponse<BidWithFreelancer[]>>,
      res: Response<ApiResponse<BidWithFreelancer[]>>
    ) => {
      try {
        const { taskId } = req.params;
        const taskBids: BidWithFreelancer[] = await prisma.bid.findMany({
          where: { taskId },
          include: {
            freelancer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        res.json({ success: true, data: taskBids });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch bids";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  // POST /api/bids - Submit a new bid for a task
  router.post(
    "/",
    [
      body("taskId").isUUID().withMessage("Valid Task ID is required"),
      body("amount")
        .isFloat({ gt: 0 })
        .withMessage("Amount must be a positive number"),
      body("proposal")
        .trim()
        .isLength({ min: 30 })
        .withMessage("Proposal must be at least 30 characters long"),
      body("timeline")
        .trim()
        .isLength({ min: 1 })
        .withMessage("Timeline is required"),
    ],
    async (
      req: AuthRequest<{}, ApiResponse<Bid>, CreateBidRequestBody>,
      res: Response<ApiResponse<Bid | ValidationError[]>>
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
        if (!req.user || req.user.role !== UserRole.freelancer) {
          return res.status(403).json({
            success: false,
            error: "Only freelancers can submit bids.",
          });
        }

        const { taskId, amount, proposal, timeline } = req.body;
        const freelancerId = req.user.id;

        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
          return res
            .status(404)
            .json({ success: false, error: "Task not found." });
        }
        if (task.status !== TaskStatus.open) {
          return res.status(400).json({
            success: false,
            error: "This task is no longer open for bidding.",
          });
        }
        if (task.clientId === freelancerId) {
          return res.status(400).json({
            success: false,
            error: "You cannot bid on your own task.",
          });
        }

        const existingBid = await prisma.bid.findFirst({
          where: { taskId, freelancerId },
        });
        if (existingBid) {
          return res.status(409).json({
            success: false,
            error: "You have already submitted a bid for this task.",
          });
        }

        const newBid: Bid = await prisma.bid.create({
          data: { taskId, freelancerId, amount, proposal, timeline },
        });

        // --- REAL-TIME NOTIFICATION ---
        const notificationMessage = `You have a new $${amount} bid on your project "${task.title}"`;
        const notification = await prisma.notification.create({
          data: { userId: task.clientId, message: notificationMessage },
        });
        getSocketIoInstance()
          .to(`user_${task.clientId}`)
          .emit("new_notification", notification);

        res.status(201).json({
          success: true,
          message: "Bid submitted successfully",
          data: newBid,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to submit bid";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  // PATCH /api/bids/:bidId/accept - Accept a bid and hire the freelancer
  router.patch(
    "/:bidId/accept",
    async (req: AuthRequest<{ bidId: string }>, res: Response<ApiResponse>) => {
      try {
        const { bidId } = req.params;
        const clientId = req.user?.id;

        if (!clientId) {
          return res
            .status(401)
            .json({ success: false, error: "User not authenticated." });
        }

        const bidToAccept = await prisma.bid.findUnique({
          where: { id: bidId },
          include: { task: true, freelancer: true },
        });

        if (!bidToAccept) {
          return res
            .status(404)
            .json({ success: false, error: "Bid not found." });
        }

        if (bidToAccept.task.clientId !== clientId) {
          return res.status(403).json({
            success: false,
            error: "You are not authorized to accept bids for this task.",
          });
        }

        if (bidToAccept.task.status !== "open") {
          return res.status(400).json({
            success: false,
            error: "This task is not open for bidding.",
          });
        }

        // --- DATABASE TRANSACTION ---
        await prisma.$transaction(async (tx) => {
          // 1. Accept the winning bid
          await tx.bid.update({
            where: { id: bidId },
            data: { status: BidStatus.accepted },
          });

          // 2. Reject all other bids for this task
          await tx.bid.updateMany({
            where: { taskId: bidToAccept.taskId, NOT: { id: bidId } },
            data: { status: BidStatus.rejected },
          });

          // 3. Update the task status to 'assigned'
          await tx.task.update({
            where: { id: bidToAccept.taskId },
            data: { status: TaskStatus.assigned },
          });
        });

        // --- NOTIFICATIONS & REAL-TIME EVENTS (Post-Transaction) ---
        const io = getSocketIoInstance();

        // Notify the winning freelancer
        const freelancerMessage = `Congratulations! Your bid for "${bidToAccept.task.title}" has been accepted.`;
        const freelancerNotification = await prisma.notification.create({
          data: {
            userId: bidToAccept.freelancerId,
            message: freelancerMessage,
          },
        });
        io.to(`user_${bidToAccept.freelancerId}`).emit(
          "new_notification",
          freelancerNotification
        );

        // Notify the client (confirmation)
        const clientMessage = `You have hired ${bidToAccept.freelancer.firstName} for your project "${bidToAccept.task.title}".`;
        const clientNotification = await prisma.notification.create({
          data: { userId: clientId, message: clientMessage },
        });
        io.to(`user_${clientId}`).emit("new_notification", clientNotification);

        // Activate the chat room for both users
        io.to(`user_${clientId}`)
          .to(`user_${bidToAccept.freelancerId}`)
          .emit("chat_activated", { taskId: bidToAccept.taskId });

        res.json({
          success: true,
          message: "Bid accepted and freelancer hired successfully.",
        });
      } catch (error: unknown) {
        console.error("Accept bid error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to accept bid.";
        res.status(500).json({ success: false, error: errorMessage });
      }
    }
  );

  return router;
};
