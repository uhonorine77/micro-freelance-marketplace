// client/src/pages/Dashboard.tsx
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "react-query";
import { notificationsApi, tasksApi } from "../services/api";
import {  UserRole, TaskStatus } from "../types";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Briefcase,
  PlusCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch recent notifications for the activity feed
  const { data: notifications = [] } = useQuery(
    "notifications",
    () => notificationsApi.getAll().then((res) => res.data.data!),
    {
      select: (data) => data.slice(0, 5), // Get latest 5
    }
  );

  // Fetch tasks for stats and recent projects list
  const { data: tasks = [] } = useQuery("tasks", () =>
    tasksApi.getAll().then((res) => res.data.data!)
  );

  const myProjects =
    user?.role === UserRole.client
      ? tasks.filter((t) => t.clientId === user.id)
      : [];
  const openProjects = tasks.filter((t) => t.status === "open");
  const completedProjects = tasks.filter((t) => t.status === "completed");

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Welcome back, {user?.firstName}!
      </h1>
      <p className="text-gray-500 mb-8">Here's a summary of your activity.</p>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {user?.role === UserRole.client && (
          <StatCard
            title="My Active Projects"
            value={myProjects.filter((p) => p.status === "in_progress").length}
            icon={Clock}
            color="bg-yellow-500"
          />
        )}
        {user?.role === UserRole.freelancer && (
          <StatCard
            title="Open for Bidding"
            value={openProjects.length}
            icon={Briefcase}
            color="bg-blue-500"
          />
        )}
        <StatCard
          title="Completed Projects"
          value={completedProjects.length}
          icon={CheckCircle}
          color="bg-green-500"
        />

        {user?.role === UserRole.client ? (
          <Link
            to="/tasks/new"
            className="bg-indigo-600 text-white p-6 rounded-lg shadow-sm flex items-center justify-between hover:bg-indigo-700 transition-colors"
          >
            <div>
              <p className="font-semibold">Have a new idea?</p>
              <p className="text-2xl font-bold">Post a Project</p>
            </div>
            <PlusCircle className="h-10 w-10 opacity-70" />
          </Link>
        ) : (
          <Link
            to="/tasks/browse"
            className="bg-indigo-600 text-white p-6 rounded-lg shadow-sm flex items-center justify-between hover:bg-indigo-700 transition-colors"
          >
            <div>
              <p className="font-semibold">Ready to work?</p>
              <p className="text-2xl font-bold">Browse Projects</p>
            </div>
            <Briefcase className="h-10 w-10 opacity-70" />
          </Link>
        )}
      </div>

      {/* --- TWO COLUMN LAYOUT FOR RECENT ACTIVITY & PROJECTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Recent Activity
          </h2>
          <ul className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <li key={n.id} className="flex items-start space-x-3">
                  <div
                    className={`mt-1 p-1.5 rounded-full ${
                      n.isRead ? "bg-gray-100" : "bg-indigo-100"
                    }`}
                  >
                    <Bell
                      className={`h-4 w-4 ${
                        n.isRead ? "text-gray-400" : "text-indigo-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm ${
                        n.isRead ? "text-gray-600" : "text-gray-800 font-medium"
                      }`}
                    >
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm text-gray-500">No new notifications.</p>
            )}
          </ul>
        </div>

        {/* Recent Projects */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {user?.role === UserRole.client
              ? "My Recent Projects"
              : "Recently Posted"}
          </h2>
          <ul className="space-y-3">
            {(user?.role === UserRole.client ? myProjects : tasks)
              .slice(0, 5)
              .map((task) => (
                <li key={task.id}>
                  <Link
                    to={`/task/${task.id}`}
                    className="block p-3 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-700 truncate">
                        {task.title}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          task.status === TaskStatus.open
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      ${task.budget} - By {task.client?.firstName}
                    </p>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
