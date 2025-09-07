import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { createServer, Server as HttpServer } from "http";
import { Server as SocketIoServer } from "socket.io";
import rateLimit from "express-rate-limit";
import { PrismaClient, UserRole } from "@prisma/client";

import { createAuthRouter } from "./routes/auth";
import { createTasksRouter } from "./routes/tasks";
import { createBidsRouter } from "./routes/bids";
import { createMilestonesRouter } from "./routes/milestones";
import { createNotificationsRouter } from "./routes/notifications";
import { createProfileRouter } from "./routes/profile";
import { createAdminRouter } from "./routes/admin";

import { authenticateToken, requireRole } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

import { setupSocketHandlers } from "./socket";
import { ApiResponse } from "./types";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const server: HttpServer = createServer(app);
const io: SocketIoServer = new SocketIoServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});
const PORT: number = parseInt(process.env.PORT || "3003", 10);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: ["http://localhost:5000", "http://localhost:5001"],
    credentials: true,
  })
);

app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "./public")));

app.use("/api/auth", createAuthRouter(prisma));
app.use("/api/tasks", authenticateToken, createTasksRouter(prisma));
app.use("/api/bids", authenticateToken, createBidsRouter(prisma));
app.use("/api/milestones", authenticateToken, createMilestonesRouter(prisma));
app.use(
  "/api/notifications",
  authenticateToken,
  createNotificationsRouter(prisma)
);
app.use("/api/profile", authenticateToken, createProfileRouter(prisma));
app.use(
  "/api/admin",
  authenticateToken,
  requireRole([UserRole.admin]),
  createAdminRouter(prisma)
);

app.get(
  "/api/health",
  (
    _req: Request,
    res: Response<ApiResponse<{ status: string; timestamp: string }>>
  ): void => {
    res.json({
      success: true,
      data: { status: "OK", timestamp: new Date().toISOString() },
    });
  }
);

setupSocketHandlers(io, prisma);

app.use(errorHandler);

const gracefulShutdown = async (): Promise<void> => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Client URL: ${process.env.CLIENT_URL || "http://localhost:5000"}`
  );
});
