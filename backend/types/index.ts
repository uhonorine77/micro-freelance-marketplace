// src/types/index.ts
import { Request } from "express";
import { ParamsDictionary, Query } from "express-serve-static-core";
import {
  UserRole,
  TaskCategory,
  BudgetType,
  TaskStatus,
  BidStatus,
  MilestoneStatus,
  User,
  Task,
  Bid,
  Milestone,
  Notification,
  Message,
} from "@prisma/client";

export {
  UserRole,
  TaskCategory,
  BudgetType,
  TaskStatus,
  BidStatus,
  MilestoneStatus,
  User,
  Task,
  Bid,
  Milestone,
  Notification,
  Message,
};

export type JwtPayload = {
  id: string;
  email: string;
  role: UserRole;
};

export interface AuthRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Query
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: JwtPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string | object[];
  data?: T;
}

export interface RegisterRequestBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface CreateTaskRequestBody {
  title: string;
  description: string;
  category: TaskCategory;
  budget: number;
  budgetType: BudgetType;
  deadline: Date;
}

export interface CreateBidRequestBody {
  taskId: string;
  amount: number;
  proposal: string;
  timeline: string;
}

export interface CreateMilestoneRequestBody {
  taskId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
}

export type AuthResponseData = {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isVerified: boolean;
    avatarUrl: string | null;
    createdAt: string;   
    updatedAt: string;
  };
};


export type UserPublicProfile = Pick<
  User,
  "id" | "firstName" | "lastName" | "email"
>;
export type TaskWithClient = Task & { client: UserPublicProfile };
export type BidWithFreelancer = Bid & { freelancer: UserPublicProfile };
export type MessageWithSender = Message & {
  sender: Pick<User, "id" | "firstName" | "lastName">;
};

export interface TaskIdParams {
  taskId: string;
}

export interface NotificationIdParams {
  id: string;
}

export interface AdminStatsData {
  totalUsers: number;
  totalTasks: number;
  totalBids: number;
  openTasks: number;
  completedTasks: number;
}

export interface JoinTaskPayload {
  taskId: string;
}

export interface SendMessagePayload {
  taskId: string;
  content: string;
}

export interface TypingPayload {
  taskId: string;
  isTyping: boolean;
}

export interface UserTypingPayload {
  userId: string;
  isTyping: boolean;
}
