// client/src/components/Layout.tsx
import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
// No longer need useTheme, Sun, or Moon
import {
  Bell,
  User as UserIcon,
  LogOut,
  Briefcase,
  Shield,
} from "lucide-react";
import { useQuery, QueryKey } from "react-query";
import { notificationsApi } from "../services/api";
import { Notification, UserRole } from "../types";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAuthPage =
    [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/check-email",
      "/verify-email",
    ].includes(location.pathname) ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/verify-email");

  const { data: notificationsData } = useQuery<
    Notification[],
    Error,
    Notification[],
    QueryKey
  >(
    ["notifications", user?.id],
    async (): Promise<Notification[]> => {
      if (!user) return [];
      const response = await notificationsApi.getAll();
      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.toString() || "Failed to fetch notifications"
        );
      }
      return response.data.data || [];
    },
    {
      enabled: !!user,
      refetchInterval: 60000,
      initialData: [],
    }
  );

  const unreadNotificationsCount =
    notificationsData?.filter((n: Notification) => !n.isRead).length ?? 0;

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Briefcase className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold text-gray-900">
                  FreelanceHub
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {user ? (
                <>
                  {user.role === UserRole.admin && (
                    <Link
                      to="/admin"
                      className="flex items-center text-indigo-600 hover:opacity-80 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      <Shield className="h-5 w-5 mr-1" />
                      Admin
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/notifications"
                    className="relative p-2 text-gray-500 hover:text-gray-700"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </Link>
                  <div className="flex items-center space-x-1 sm:space-x-3">
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100"
                    >
                      <UserIcon className="h-8 w-8 text-gray-500 bg-gray-100 rounded-full p-1" />
                      <span className="text-sm font-medium text-gray-700 hidden sm:block">
                        {user.firstName}
                      </span>
                    </Link>
                    <button
                      onClick={logout}
                      className="text-gray-500 hover:text-gray-700 p-2"
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
      </header>
      <main className="py-8">{children}</main>
    </div>
  );
};

export default Layout;
