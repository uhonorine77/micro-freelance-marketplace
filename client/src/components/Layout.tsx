// src/components/Layout.tsx
import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, User as UserIcon, LogOut, Briefcase } from 'lucide-react';
import { useQuery, QueryKey } from 'react-query';
import { notificationsApi } from '../services/api';
import { Notification } from '../types';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  const { data: notificationsData } = useQuery<Notification[], Error, Notification[], QueryKey>(
    ['notifications', user?.id],
    async (): Promise<Notification[]> => {
      if (!user) return [];
      const response = await notificationsApi.getAll();
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch notifications');
      }
      return response.data.data;
    },
    {
      enabled: !!user,
      refetchInterval: 60000,
      initialData: [], // Provides an empty array as a fallback
    }
  );

  if(!notificationsData) {
    return "no notification"
  }
  // Safely calculate unread count. `notificationsData` is guaranteed to be an array here due to `initialData`.
  const unreadNotificationsCount = notificationsData.filter((n: Notification) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthPage && (
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center space-x-2">
                  <Briefcase className="h-8 w-8 text-indigo-800" />
                  <span className="text-xl font-bold text-gray-900">Freelance Marketplace</span>
                </Link>
              </div>

              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Dashboard
                    </Link>
                    <button className="relative p-2 text-gray-400 hover:text-gray-500">
                      <Bell className="h-6 w-6" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                        <span className="text-sm font-medium text-gray-700">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                      <button
                        onClick={logout}
                        className="text-gray-400 hover:text-gray-500 p-2"
                        title="Logout"
                      >
                        <LogOut className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/login"
                      className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={isAuthPage ? '' : 'pt-4'}>
        {children}
      </main>
    </div>
  );
};

export default Layout;