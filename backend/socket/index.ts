import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient, BidStatus } from "@prisma/client";
import {
  JwtPayload,
  JoinTaskPayload,
  SendMessagePayload,
  TypingPayload,
  UserTypingPayload,
  MessageWithSender,
} from "../types";

interface AuthenticatedSocket extends Socket {
  data: {
    user: JwtPayload;
  };
}

let ioInstance: Server;

export const getSocketIoInstance = (): Server => {
  if (!ioInstance) {
    throw new Error("Socket.IO has not been initialized.");
  }
  return ioInstance;
};

const isUserAuthorizedForTask = async (
  prisma: PrismaClient,
  userId: string,
  taskId: string
): Promise<boolean> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      clientId: true,
      bids: {
        where: { status: BidStatus.accepted },
        select: { freelancerId: true },
      },
    },
  });

  if (!task) return false;

  if (task.clientId === userId) return true;

  const acceptedFreelancerId = task.bids[0]?.freelancerId;
  if (acceptedFreelancerId && acceptedFreelancerId === userId) return true;

  return false;
};

export const setupSocketHandlers = (io: Server, prisma: PrismaClient): void => {
  ioInstance = io;

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }
    try {
      const decoded = jwt.verify(
        token as string,
        process.env.JWT_SECRET as string
      ) as JwtPayload;

      (socket as AuthenticatedSocket).data.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const currentUser = authSocket.data.user;

    console.log(`User connected: ${currentUser.email} (ID: ${currentUser.id})`);

    authSocket.join(`user_${currentUser.id}`);

    authSocket.on("join_task", async (payload: JoinTaskPayload) => {
      const { taskId } = payload;
      const isAuthorized = await isUserAuthorizedForTask(
        prisma,
        currentUser.id,
        taskId
      );

      if (isAuthorized) {
        authSocket.join(`task_${taskId}`);
        console.log(
          `User ${currentUser.id} successfully joined task room ${taskId}`
        );

        const messages: MessageWithSender[] = await prisma.message.findMany({
          where: { taskId },
          orderBy: { createdAt: "asc" },
          take: 100,
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        authSocket.emit("load_messages", messages);
      } else {
        console.log(
          `Unauthorized attempt by user ${currentUser.id} to join task room ${taskId}`
        );
        authSocket.emit("unauthorized", {
          message: "You are not authorized to join this chat.",
        });
      }
    });

    authSocket.on("send_message", async (payload: SendMessagePayload) => {
      const { taskId, content } = payload;

      const isAuthorized = await isUserAuthorizedForTask(
        prisma,
        currentUser.id,
        taskId
      );
      if (!isAuthorized) {
        return authSocket.emit("unauthorized", {
          message: "You are not authorized to send messages to this chat.",
        });
      }

      try {
        const message: MessageWithSender = await prisma.message.create({
          data: {
            taskId: taskId,
            senderId: currentUser.id,
            content: content,
          },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        io.to(`task_${taskId}`).emit("new_message", message);
      } catch (error) {
        console.error("Failed to save or broadcast message:", error);
        authSocket.emit("error", { message: "Failed to send message." });
      }
    });

    authSocket.on("typing", (payload: TypingPayload) => {
      const { taskId, isTyping } = payload;
      const typingPayload: UserTypingPayload = {
        userId: currentUser.id,
        isTyping: isTyping,
      };

      authSocket.to(`task_${taskId}`).emit("user_typing", typingPayload);
    });

    authSocket.on("leave_task", (payload: { taskId: string }) => {
      authSocket.leave(`task_${payload.taskId}`);
      console.log(`User ${currentUser.id} left task room ${payload.taskId}`);
    });

    authSocket.on("disconnect", () => {
      console.log(
        `User disconnected: ${currentUser.email} (ID: ${currentUser.id})`
      );
    });
  });
};
