// src/types/index.ts

import { Request } from 'express';
import { ParamsDictionary, Query } from 'express-serve-static-core';

// === IMPORTANT: Specific import path for Prisma types to resolve runtime errors ===
// This bypasses complex module resolution for @prisma/client package
import {
  UserRole, TaskCategory, BudgetType, TaskStatus, BidStatus, MilestoneStatus,
  User, Task, Bid, Milestone, Notification, Message,
} from '../node_modules/.prisma/client';
// =================================================================================

export {
  UserRole, TaskCategory, BudgetType, TaskStatus, BidStatus, MilestoneStatus,
  User, Task, Bid, Milestone, Notification, Message,
};

// ===========================================
// JWT Payload Type
// ===========================================
export type JwtPayload = {
  id: string;
  email: string;
  role: UserRole;
};

// ===========================================
// Custom Express Request Type for Authentication
// P: Path parameters (e.g., { id: string })
// ResBody: Type of the response body
// ReqBody: Type of the request body
// ReqQuery: Type of the request query parameters
// ===========================================
export interface AuthRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Query
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: JwtPayload; // The decoded JWT payload, made optional as middleware sets it
}

// ===========================================
// Generic API Response Interface
// ===========================================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string | object[]; // Can be a string message or an array of validation errors
  data?: T;
}

// ===========================================
// Request Body Types (DTOs - Data Transfer Objects)
// These define the expected structure of incoming JSON payloads
// ===========================================
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
  budget: number; // After `toFloat()` conversion
  budgetType: BudgetType;
  deadline: Date; // After `toDate()` conversion
}

export interface CreateBidRequestBody {
  taskId: string;
  amount: number; // After `toFloat()` conversion
  proposal: string;
  timeline: string;
}

export interface CreateMilestoneRequestBody {
  taskId: string;
  title: string;
  description: string;
  amount: number; // After `toFloat()` conversion
  dueDate: Date; // After `toDate()` conversion
}

// ===========================================
// Response Data Types
// These define the structure of data sent back in `ApiResponse.data`
// ===========================================
export type AuthResponseData = {
  token: string;
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'isVerified'>;
};

// Custom types for Prisma models when including relations or selecting specific fields
export type UserPublicProfile = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
export type TaskWithClient = Task & { client: UserPublicProfile };
export type BidWithFreelancer = Bid & { freelancer: UserPublicProfile };
export type MessageWithSender = Message & { sender: Pick<User, 'id' | 'firstName' | 'lastName'> };

// ===========================================
// Request Params Types
// These define the expected structure of URL parameters
// ===========================================
export interface TaskIdParams {
  taskId: string;
}

export interface NotificationIdParams {
  id: string;
}

// ===========================================
// Socket.IO Event Payloads
// ===========================================
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