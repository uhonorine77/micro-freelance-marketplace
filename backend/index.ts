// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIoServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

// Import route creation functions
import { createAuthRouter } from './routes/auth';
import { createTasksRouter } from './routes/tasks';
import { createBidsRouter } from './routes/bids';
import { createMilestonesRouter } from './routes/milestones'; 
import { createNotificationsRouter } from './routes/notifications';

import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

import { setupSocketHandlers } from './socket';
import { ApiResponse } from './types';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient();

const app = express();
const server: HttpServer = createServer(app);
const io: SocketIoServer = new SocketIoServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

const PORT: number = parseInt(process.env.PORT || '3003', 10);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Middleware setup
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5000",
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Route handlers, passing the prisma client
app.use('/api/auth', createAuthRouter(prisma));
app.use('/api/tasks', authenticateToken, createTasksRouter(prisma));

app.use('/api/bids', authenticateToken, createBidsRouter(prisma));
app.use('/api/milestones', authenticateToken, createMilestonesRouter(prisma)); // <-- Ensure this is used
app.use('/api/notifications', authenticateToken, createNotificationsRouter(prisma));

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response<ApiResponse<{ status: string; timestamp: string }>>): void => {
  res.json({ success: true, data: { status: 'OK', timestamp: new Date().toISOString() } });
});

// Setup Socket.IO handlers
setupSocketHandlers(io, prisma); // <-- Ensure this is called

// Global Error Handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || "http://localhost:5000"}`);
});