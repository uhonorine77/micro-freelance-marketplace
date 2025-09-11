import axios, { AxiosResponse, AxiosError } from "axios";
import {
  ApiResponse,
  AuthResponseData,
  Task,
  Bid,
  Milestone,
  Notification,
  User,
  RegisterPayload,
  LoginPayload,
  UpdateProfilePayload,
  CreateTaskPayload,
  CreateBidPayload,
  CreateMilestonePayload,
  TaskWithClient,
  BidWithFreelancer,
  MessageWithSender,
  AdminStatsData,
} from "../types";

const API_BASE_URL = "https://micro-freelance-marketplace.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      !error.request?.responseURL?.includes("/auth")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (
    credentials: LoginPayload
  ): Promise<AxiosResponse<ApiResponse<AuthResponseData>>> =>
    api.post("/auth/login", credentials),
  register: (userData: RegisterPayload): Promise<AxiosResponse<ApiResponse>> =>
    api.post("/auth/register", userData),
  verifyEmail: (token: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/auth/verify-email/${token}`),
  resendVerification: (): Promise<AxiosResponse<ApiResponse>> =>
    api.post("/auth/resend-verification"),
  forgotPassword: (email: string): Promise<AxiosResponse<ApiResponse>> =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: ({
    token,
    password,
  }: {
    token: string;
    password: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/auth/reset-password/${token}`, { password }),
};

export const tasksApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<TaskWithClient[]>>> =>
    api.get("/tasks"),
  create: (
    taskData: CreateTaskPayload
  ): Promise<AxiosResponse<ApiResponse<Task>>> => api.post("/tasks", taskData),
  getById: (id: string): Promise<AxiosResponse<ApiResponse<TaskWithClient>>> =>
    api.get(`/tasks/${id}`),
};

export const bidsApi = {
  getByTask: (
    taskId: string
  ): Promise<AxiosResponse<ApiResponse<BidWithFreelancer[]>>> =>
    api.get(`/bids/task/${taskId}`),
  getMyBids: (): Promise<AxiosResponse<ApiResponse<BidWithFreelancer[]>>> =>
    api.get('/bids/my-bids'),
  create: (
    bidData: CreateBidPayload
  ): Promise<AxiosResponse<ApiResponse<Bid>>> => api.post("/bids", bidData),
  accept: (bidId: string): Promise<AxiosResponse<ApiResponse>> =>
    api.patch(`/bids/${bidId}/accept`),
};

export const milestonesApi = {
  getByTask: (
    taskId: string
  ): Promise<AxiosResponse<ApiResponse<Milestone[]>>> =>
    api.get(`/milestones/task/${taskId}`),
  create: (
    milestoneData: CreateMilestonePayload
  ): Promise<AxiosResponse<ApiResponse<Milestone>>> =>
    api.post("/milestones", milestoneData),
  requestCompletion: (
    milestoneId: string
  ): Promise<AxiosResponse<ApiResponse<Milestone>>> =>
    api.patch(`/milestones/${milestoneId}/complete`),
  releasePayment: (
    milestoneId: string
  ): Promise<AxiosResponse<ApiResponse<Milestone>>> =>
    api.patch(`/milestones/${milestoneId}/release-payment`),
};

export const notificationsApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<Notification[]>>> =>
    api.get("/notifications"),
  markAsRead: (id: string): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.patch(`/notifications/${id}/read`),
  markAllAsRead: (): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.patch("/notifications/read-all"),
};

export const chatApi = {
  getMessagesByTask: (
    taskId: string
  ): Promise<AxiosResponse<ApiResponse<MessageWithSender[]>>> =>
    api.get(`/chat/task/${taskId}`),
};

export const profileApi = {
  get: (): Promise<AxiosResponse<ApiResponse<User>>> => api.get("/profile"),
  update: (
    userData: UpdateProfilePayload
  ): Promise<AxiosResponse<ApiResponse<User>>> => api.put("/profile", userData),
  uploadPicture: (
    file: File
  ): Promise<AxiosResponse<ApiResponse<{ avatarUrl: string }>>> => {
    const formData = new FormData();
    formData.append("avatar", file);
    return api.post("/profile/picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const adminApi = {
  getStats: (): Promise<AxiosResponse<ApiResponse<AdminStatsData>>> =>
    api.get("/admin/stats"),
  getUsers: (): Promise<AxiosResponse<ApiResponse<User[]>>> =>
    api.get("/admin/users"),
  deleteUser: (userId: string): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.delete(`/admin/users/${userId}`),
  getTasks: (): Promise<AxiosResponse<ApiResponse<TaskWithClient[]>>> =>
    api.get("/admin/tasks"),
  deleteTask: (taskId: string): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.delete(`/admin/tasks/${taskId}`),
};
