// client/src/pages/Dashboard.tsx
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "react-query";
import { notificationsApi, tasksApi, bidsApi } from "../services/api";
import { UserRole, TaskStatus, BidStatus, TaskWithClient, Notification, BidWithFreelancer } from "../types";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Briefcase,
  PlusCircle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";

// Reusable Stat Card Component
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
  // navigate was removed as it was unused

  const { data: allTasks, isLoading: isLoadingTasks } = useQuery(
    'allTasksForDashboard',
    () => tasksApi.getAll().then((res) => res.data.data || []),
    { enabled: !!user }
  );

  const { data: myBids, isLoading: isLoadingBids } = useQuery(
    'myBidsForDashboard',
    () => bidsApi.getMyBids().then((res) => res.data.data || []), // FIX: Now correctly calls getMyBids
    { enabled: user?.role === UserRole.freelancer }
  );

  const { data: notifications = [], isLoading: isLoadingNotifications } = useQuery(
    "notifications",
    () => notificationsApi.getAll().then((res) => res.data.data!),
    {
      enabled: !!user,
      select: (data) => data.slice(0, 5),
    }
  );

  const stats = React.useMemo(() => {
    if (!user || !allTasks) return { active: 0, completed: 0, open: 0 };
    
    if (user.role === UserRole.client) {
      const myProjects = allTasks.filter(t => t.clientId === user.id);
      return {
        active: myProjects.filter(p => p.status === TaskStatus.in_progress || p.status === TaskStatus.assigned).length,
        completed: myProjects.filter(p => p.status === TaskStatus.completed).length,
        open: 0,
      };
    }
    
    if (user.role === UserRole.freelancer) {
      // FIX: Added explicit 'any' type cast for task on bid object because it's not fully typed in the relation
      const myAcceptedTaskIds = myBids?.filter((b: BidWithFreelancer) => b.status === BidStatus.accepted).map((b: BidWithFreelancer) => (b.task as any).id) || [];
      const myCompletedTasks = allTasks.filter(t => myAcceptedTaskIds.includes(t.id) && t.status === TaskStatus.completed).length;
      return {
        active: 0,
        completed: myCompletedTasks,
        open: allTasks.filter(t => t.status === TaskStatus.open).length,
      };
    }

    return { active: 0, completed: 0, open: 0 };
  }, [user, allTasks, myBids]);
  
  const recentProjects = (user?.role === UserRole.client 
    ? allTasks?.filter(t => t.clientId === user.id) 
    : allTasks
  )?.slice(0, 5) || [];

  if (isLoadingTasks || isLoadingNotifications || (user?.role === UserRole.freelancer && isLoadingBids)) {
    return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" /></div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Welcome back, {user?.firstName}!
      </h1>
      <p className="text-gray-500 mb-8">Here's a summary of your activity.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {user?.role === UserRole.client && (
          <>
            <StatCard title="My Active Projects" value={stats.active} icon={Clock} color="bg-yellow-500" />
            <StatCard title="Completed Projects" value={stats.completed} icon={CheckCircle} color="bg-green-500" />
          </>
        )}
        {user?.role === UserRole.freelancer && (
          <>
            <StatCard title="Open for Bidding" value={stats.open} icon={Briefcase} color="bg-blue-500" />
            <StatCard title="My Completed Projects" value={stats.completed} icon={CheckCircle} color="bg-green-500" />
          </>
        )}
        
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Recent Activity
          </h2>
          <ul className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((n: Notification) => (
                <li key={n.id} className="flex items-start space-x-3">
                  <div className={`mt-1 p-1.5 rounded-full ${ n.isRead ? "bg-gray-100" : "bg-indigo-100" }`}>
                    <Bell className={`h-4 w-4 ${ n.isRead ? "text-gray-400" : "text-indigo-600" }`} />
                  </div>
                  <div>
                    <p className={`text-sm ${ n.isRead ? "text-gray-600" : "text-gray-800 font-medium" }`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm text-center text-gray-500 py-8">No new activity to show.</p>
            )}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {user?.role === UserRole.client ? "My Recent Projects" : "Recently Posted"}
          </h2>
          <ul className="space-y-3">
            {recentProjects.length > 0 ? (
              recentProjects.map((task: TaskWithClient) => (
                <li key={task.id}>
                  <Link to={`/task/${task.id}`} className="block p-3 rounded-md hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-700 truncate">{task.title}</p>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                        task.status === TaskStatus.open ? "bg-green-100 text-green-800" :
                        task.status === TaskStatus.in_progress || task.status === TaskStatus.assigned ? "bg-blue-100 text-blue-800" :
                        "bg-purple-100 text-purple-800"
                      }`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      ${task.budget} - By {task.client?.firstName}
                    </p>
                  </Link>
                </li>
              ))
            ) : (
                <p className="text-sm text-center text-gray-500 py-8">
                    {user?.role === UserRole.client ? "You haven't posted any projects yet." : "No projects have been posted recently."}
                </p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;