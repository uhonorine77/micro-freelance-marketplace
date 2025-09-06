// src/pages/admin/AdminDashboard.tsx
import React from 'react';
import { useQuery } from 'react-query';
import { adminApi } from '../../services/api';
import { AdminStatsData } from '../../types';
import { Users, Briefcase, FileText, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: number | string; color: string }> = ({ icon, title, value, color }) => (
  <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700 flex items-center space-x-4`}>
    <div className={`p-3 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading, isError } = useQuery<AdminStatsData, Error>(
    'adminStats',
    async () => {
      const response = await adminApi.getStats();
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch stats');
      }
      return response.data.data;
    }
  );

  if (isLoading) {
    return <div className="p-8 text-center">Loading Admin Dashboard...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Error loading statistics.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <StatCard icon={<Users className="h-6 w-6 text-white" />} title="Total Users" value={stats?.totalUsers ?? 0} color="bg-blue-500" />
        <StatCard icon={<Briefcase className="h-6 w-6 text-white" />} title="Total Tasks" value={stats?.totalTasks ?? 0} color="bg-purple-500" />
        <StatCard icon={<FileText className="h-6 w-6 text-white" />} title="Total Bids" value={stats?.totalBids ?? 0} color="bg-yellow-500" />
        <StatCard icon={<Clock className="h-6 w-6 text-white" />} title="Open Tasks" value={stats?.openTasks ?? 0} color="bg-green-500" />
        <StatCard icon={<CheckCircle className="h-6 w-6 text-white" />} title="Completed Tasks" value={stats?.completedTasks ?? 0} color="bg-gray-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Management</h2>
          <div className="space-y-3">
            <Link to="/admin/users" className="block w-full text-center bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors">
              Manage Users
            </Link>
            <Link to="/admin/tasks" className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition-colors">
              Manage Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;