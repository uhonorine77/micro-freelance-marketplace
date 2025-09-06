// src/pages/admin/ManageTasks.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminApi } from '../../services/api';
import { TaskWithClient, TaskStatus } from '../../types';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const ManageTasks: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading, isError } = useQuery<TaskWithClient[], Error>(
    'adminTasks',
    async () => {
      const response = await adminApi.getTasks();
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch tasks');
      }
      return response.data.data;
    }
  );

  const deleteTaskMutation = useMutation<any, Error, string>(
    (taskId) => adminApi.deleteTask(taskId),
    {
      onSuccess: (data) => {
        toast.success(data?.data?.message || 'Task deleted successfully!');
        queryClient.invalidateQueries('adminTasks');
        queryClient.invalidateQueries('adminStats');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || err.message || 'Failed to delete task.');
      },
    }
  );

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this task and all its related data? This action cannot be undone.')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading tasks...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Error loading tasks.</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link to="/admin" className="text-indigo-600 dark:text-indigo-400 hover:underline">&larr; Back to Admin Dashboard</Link>
        <h1 className="text-3xl font-bold mt-2">Manage Tasks</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Task Title</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Client</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created On</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {tasks?.map(task => (
              <tr key={task.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link to={`/task/${task.id}`} className="text-sm font-medium text-indigo-600 hover:underline" title={task.title}>{task.title}</Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{task.client?.firstName} {task.client?.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                      task.status === TaskStatus.open ? 'bg-green-100 text-green-800' :
                      task.status === TaskStatus.assigned || task.status === TaskStatus.in_progress ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                   <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deleteTaskMutation.isLoading}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                      title="Delete Task"
                   >
                     <Trash2 className="h-5 w-5" />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageTasks;