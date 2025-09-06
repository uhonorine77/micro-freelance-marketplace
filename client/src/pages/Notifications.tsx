// src/pages/Notifications.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from 'react-query';
import { notificationsApi } from '../services/api';
import { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const Notifications: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<Notification[], Error, Notification[], QueryKey>(
    'notifications',
    async () => {
      const response = await notificationsApi.getAll();
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch notifications');
      }
      return response.data.data || [];
    }
  );

  const markAsReadMutation = useMutation<null, Error, string>(
    (id) => notificationsApi.markAsRead(id).then((res) => {
      if (!res.data.success) {
        throw new Error(res.data.error?.toString() || 'Failed to mark as read');
      }
      return res.data.data;
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
      },
      onError: (err: Error) => {
        toast.error(err.message);
      },
    }
  );

  const markAllAsReadMutation = useMutation<null, Error>(
    () => notificationsApi.markAllAsRead().then((res) => {
       if (!res.data.success) {
        throw new Error(res.data.error?.toString() || 'Failed to mark all as read');
      }
      return res.data.data
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
        toast.success('All notifications marked as read!');
      },
      onError: (err: Error) => {
        toast.error(err.message);
      },
    }
  );

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  const hasUnread = notifications?.some(n => !n.isRead);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {notifications && notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isLoading || !hasUnread}
            className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <CheckCheck className="h-5 w-5 mr-2" />
            Mark All as Read
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 rounded-lg">
        {isLoading ? (
          <p className="text-center p-12 text-gray-500 dark:text-gray-400">Loading notifications...</p>
        ) : notifications && notifications.length > 0 ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`p-4 flex items-start space-x-4 ${!notification.isRead ? 'bg-indigo-50 dark:bg-gray-900/50' : ''}`}
              >
                <div className="flex-shrink-0 pt-1">
                  <Bell className={`h-6 w-6 ${notification.isRead ? 'text-gray-400' : 'text-indigo-500'}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                    disabled={markAsReadMutation.isLoading}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400"
                    title="Mark as read"
                  >
                     <CheckCheck className="h-5 w-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-16">
            <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No new notifications</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">You're all caught up!</p>
            <Link to="/dashboard" className="mt-4 inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;