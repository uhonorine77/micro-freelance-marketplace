export enum UserRole {
  freelancer = 'freelancer',
  client = 'client',
  admin = 'admin',
}

export enum TaskCategory {
  web_development = 'web_development',
  mobile_development = 'mobile_development',
  design = 'design',
  writing = 'writing',
  marketing = 'marketing',
  data_analysis = 'data_analysis',
  other = 'other',
}

export enum BudgetType {
  fixed = 'fixed',
  hourly = 'hourly',
}

export enum TaskStatus {
  open = 'open',
  assigned = 'assigned',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
}

export enum BidStatus {
  pending = 'pending',
  accepted = 'accepted',
  rejected = 'rejected',
  withdrawn = 'withdrawn',
}

export enum MilestoneStatus {
  pending = 'pending',
  in_progress = 'in_progress',
  completed = 'completed',
  paid = 'paid',
  cancelled = 'cancelled',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  avatarUrl : string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
}

export interface UserPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  budget: number;
  budgetType: BudgetType;
  deadline: string;
  status: TaskStatus;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  taskId: string;
  freelancerId: string;
  amount: number;
  proposal: string;
  timeline: string;
  status: BidStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  taskId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  taskId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface TaskWithClient extends Task {
  client?: UserPublicProfile;
}

export interface BidWithFreelancer extends Bid {
  freelancer?: UserPublicProfile;
}

export interface MessageWithSender extends Message {
  sender?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

export interface AuthResponseData {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string | object[] | { message: string }[];
  data?: T;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  category: TaskCategory;
  budget: number;
  budgetType: BudgetType;
  deadline: string;
}

export interface CreateBidPayload {
  taskId: string;
  amount: number;
  proposal: string;
  timeline: string;
}

export interface CreateMilestonePayload {
  taskId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
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