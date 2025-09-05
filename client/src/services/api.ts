// src/services/api.ts
import axios, { AxiosResponse, AxiosError } from 'axios';
import {
  ApiResponse,
  AuthResponseData,
  Task,
  Bid,
  Milestone,
  Notification,
  RegisterPayload,
  LoginPayload,
  CreateTaskPayload,
  CreateBidPayload,
  CreateMilestonePayload,
  TaskWithClient,
  BidWithFreelancer,
  MessageWithSender
} from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.request?.responseURL?.includes('/auth/login') && !error.request?.responseURL?.includes('/auth/register')) {
      console.warn('Unauthorized access, clearing token and redirecting to login.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials: LoginPayload): Promise<AxiosResponse<ApiResponse<AuthResponseData>>> =>
    api.post<ApiResponse<AuthResponseData>>('/auth/login', credentials),

  register: (userData: RegisterPayload): Promise<AxiosResponse<ApiResponse<AuthResponseData>>> =>
    api.post<ApiResponse<AuthResponseData>>('/auth/register', userData),
};

export const tasksApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<TaskWithClient[]>>> => api.get<ApiResponse<TaskWithClient[]>>('/tasks'),
  create: (taskData: CreateTaskPayload): Promise<AxiosResponse<ApiResponse<Task>>> => api.post<ApiResponse<Task>>('/tasks', taskData),
  getById: (id: string): Promise<AxiosResponse<ApiResponse<TaskWithClient>>> => api.get<ApiResponse<TaskWithClient>>(`/tasks/${id}`),
};

export const bidsApi = {
  getByTask: (taskId: string): Promise<AxiosResponse<ApiResponse<BidWithFreelancer[]>>> => api.get<ApiResponse<BidWithFreelancer[]>>(`/bids/task/${taskId}`),
  create: (bidData: CreateBidPayload): Promise<AxiosResponse<ApiResponse<Bid>>> => api.post<ApiResponse<Bid>>('/bids', bidData),
};

export const milestonesApi = {
  getByTask: (taskId: string): Promise<AxiosResponse<ApiResponse<Milestone[]>>> => api.get<ApiResponse<Milestone[]>>(`/milestones/task/${taskId}`),
  create: (milestoneData: CreateMilestonePayload): Promise<AxiosResponse<ApiResponse<Milestone>>> => api.post<ApiResponse<Milestone>>('/milestones', milestoneData),
};

export const notificationsApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<Notification[]>>> => api.get<ApiResponse<Notification[]>>('/notifications'),
  markAsRead: (id: string): Promise<AxiosResponse<ApiResponse<null>>> => api.patch<ApiResponse<null>>(`/notifications/${id}/read`),
};

export const chatApi = {
    getMessagesByTask: (taskId: string): Promise<AxiosResponse<ApiResponse<MessageWithSender[]>>> => api.get<ApiResponse<MessageWithSender[]>>(`/chat/task/${taskId}`),
};