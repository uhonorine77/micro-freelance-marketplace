// src/socket/index.ts
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
  JwtPayload,
  JoinTaskPayload,
  SendMessagePayload,
  TypingPayload,
  UserTypingPayload,
  MessageWithSender,
  TaskStatus,
  UserRole
} from '../types'; 

// Define custom Socket type for better type safety
interface CustomSocket extends Socket {
  data: {
    user?: JwtPayload; // User from JWT payload
  };
}

let ioInstance: Server;

export const getSocketIoInstance = (): Server => {
  if (!ioInstance) {
    throw new Error("Socket.IO has not been initialized.");
  }
  return ioInstance;
};

export const setupSocketHandlers = (io: Server, prisma: PrismaClient): void => {
  ioInstance = io; 
  io.use((socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token as string, (process.env.JWT_SECRET || 'fallback-secret') as string);
      socket.data.user = decoded as JwtPayload; // Cast to JwtPayload
      next();
    } catch (err: unknown) {
      next(new Error(`Authentication error: ${(err instanceof Error) ? err.message : 'Invalid token'}`));
    }
  });

  io.on('connection', (socket: CustomSocket) => {
    if (!socket.data.user) {
      console.error('Socket connected without user data. Disconnecting.');
      socket.emit('error', 'Authentication failed');
      socket.disconnect(true);
      return;
    }
    console.log(`User ${socket.data.user.id} connected`);

    // Join a room for personal notifications
    socket.join(`user_${socket.data.user.id}`);

    socket.on('join_task', async (payload: JoinTaskPayload) => {
      const { taskId } = payload;
      const currentUser: JwtPayload | undefined = socket.data.user;

      if (!currentUser) {
        socket.emit('error', 'Authentication required to join task');
        return;
      }

      // Verify if the user is part of the task or has permissions
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { clientId: true, bids: { where: { status: 'accepted' }, select: { freelancerId: true } } }
      });

      if (!task) {
        socket.emit('error', 'Task not found');
        return;
      }

      const isClient: boolean = task.clientId === currentUser.id;
      const isAcceptedFreelancer: boolean = task.bids.some(bid => bid.freelancerId === currentUser.id);

      if (isClient || isAcceptedFreelancer) {
        socket.join(`task_${taskId}`);
        console.log(`User ${currentUser.id} joined task ${taskId}`);

        const messages: MessageWithSender[] = await prisma.message.findMany({
          where: { taskId },
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } }
        });
        socket.emit('load_messages', messages);
      } else {
        socket.emit('error', 'Unauthorized to join this task chat');
        socket.disconnect(true);
      }
    });

    socket.on('send_message', async (payload: SendMessagePayload) => {
      const { taskId, content } = payload;
      const currentUser: JwtPayload | undefined = socket.data.user;

      if (!currentUser?.id) {
        socket.emit('error', 'Authentication required to send messages');
        return;
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { clientId: true, bids: { where: { status: 'accepted' }, select: { freelancerId: true } } }
      });

      if (!task) {
        socket.emit('error', 'Task not found for message');
        return;
      }

      const isClient: boolean = task.clientId === currentUser.id;
      const isAcceptedFreelancer: boolean = task.bids.some(bid => bid.freelancerId === currentUser.id);

      if (!(isClient || isAcceptedFreelancer)) {
        socket.emit('error', 'Unauthorized to send messages to this task');
        return;
      }

      try {
        const message: MessageWithSender = await prisma.message.create({
          data: {
            taskId: taskId,
            senderId: currentUser.id,
            content: content,
          },
          include: { sender: { select: { id: true, firstName: true, lastName: true } } }
        });

        io.to(`task_${taskId}`).emit('new_message', message);
      } catch (error: unknown) {
        console.error('Failed to save message:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('typing', (payload: TypingPayload) => {
      const { taskId, isTyping } = payload;
      const currentUser: JwtPayload | undefined = socket.data.user;

      if (!currentUser?.id) return;

      const typingPayload: UserTypingPayload = {
        userId: currentUser.id,
        isTyping: isTyping
      };
      socket.to(`task_${taskId}`).emit('user_typing', typingPayload);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user?.id} disconnected`);
    });
  });
};