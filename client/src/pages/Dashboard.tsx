// src/pages/Dashboard.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, Briefcase, BellOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, QueryKey } from 'react-query';
import { tasksApi, notificationsApi } from '../services/api';
import { TaskWithClient, Notification, Task, UserRole, TaskStatus } from '../types';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    isError: isErrorTasks,
    error: tasksError
  } = useQuery<(TaskWithClient | Task)[], Error, (TaskWithClient | Task)[], QueryKey>(
    ['tasks', user?.id, user?.role],
    async (): Promise<(TaskWithClient | Task)[]> => {
      if (!user) return [];
      const response = await tasksApi.getAll();
      if (!response.data.success) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch tasks');
      }
      const data = response.data.data;
      if (!data) return [];

      if (user.role === UserRole.client) {
        return data.filter((task) => task.clientId === user.id);
      }
      return data;
    },
    {
      enabled: !!user,
      initialData: [],
    }
  );

  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    isError: isErrorNotifications,
    error: notificationsError
  } = useQuery<Notification[], Error, Notification[], QueryKey>(
    ['notifications', user?.id],
    async (): Promise<Notification[]> => {
      if (!user) return [];
      const response = await notificationsApi.getAll();
      if (!response.data.success) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch notifications');
      }
      return response.data.data || [];
    },
    {
      enabled: !!user,
      initialData: [],
    }
  );

  const recentActivity = notificationsData?.slice(0, 5) || [];

  if (isLoadingTasks || isLoadingNotifications) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
        Loading dashboard...
      </div>
    );
  }

  if (isErrorTasks || isErrorNotifications) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-red-600">
        Error loading dashboard data: {tasksError?.message || notificationsError?.message || 'Unknown error.'}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">
          {user?.role === UserRole.client
            ? 'Manage your projects and find talented freelancers'
            : 'Discover new opportunities and grow your freelance career'
          }
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {user?.role === UserRole.client ? 'Post New Project' : 'Browse Projects'}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                {user?.role === UserRole.client
                  ? 'Get started by posting your first project'
                  : 'Find your next opportunity'
                }
              </p>
            </div>
            <Plus className="h-8 w-8 text-indigo-600" />
          </div>
          <button
            onClick={() => navigate(user?.role === UserRole.client ? '/tasks/new' : '/tasks')}
            className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
          >
            {user?.role === UserRole.client ? 'Post Project' : 'Browse Projects'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Projects</h3>
              <p className="text-gray-600 text-sm mt-1">{tasksData?.length || 0} projects</p>
            </div>
            <Search className="h-8 w-8 text-green-600" />
          </div>
          <button className="mt-4 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors">
            View All
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {user?.role === UserRole.client ? 'Pending Bids' : 'My Proposals'}
              </h3>
              <p className="text-gray-600 text-sm mt-1">0 awaiting review</p>
            </div>
            <Filter className="h-8 w-8 text-orange-600" />
          </div>
          <button className="mt-4 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors">
            Review
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentActivity.map((notification: Notification) => (
                <li key={notification.id} className="py-3 sm:py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <BellOff className={`h-6 w-6 ${notification.isRead ? 'text-gray-400' : 'text-indigo-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                        {notification.message}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="inline-flex items-center text-base font-semibold text-indigo-600">
                        New
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Briefcase className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-600">
                {user?.role === UserRole.client
                  ? 'Start by posting your first project to see activity here'
                  : 'Submit your first proposal to see activity here'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {user?.role === UserRole.client ? 'My Projects' : 'Available Projects'}
          </h2>
        </div>
        <div className="p-6">
          {tasksData && tasksData.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {tasksData.map((task: TaskWithClient | Task) => (
                <li key={task.id} className="py-4">
                  <Link to={`/task/${task.id}`} className="block hover:bg-gray-50 p-2 rounded-md">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-indigo-700">{task.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        task.status === TaskStatus.open ? 'bg-green-100 text-green-800' :
                        task.status === TaskStatus.assigned ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1 truncate">{task.description}</p>
                    <div className="mt-2 text-xs text-gray-500 flex items-center space-x-4">
                      <span>Budget: ${task.budget} ({task.budgetType})</span>
                      <span>Deadline: {format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6 text-gray-600">No projects found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;