// src/pages/admin/ManageUsers.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminApi } from '../../services/api';
import { User } from '../../types';
import { format } from 'date-fns';
import { Trash2, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ManageUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError } = useQuery<User[], Error>(
    'adminUsers',
    async () => {
      const response = await adminApi.getUsers();
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch users');
      }
      return response.data.data;
    }
  );

  const deleteUserMutation = useMutation<any, Error, string>(
    (userId) => adminApi.deleteUser(userId),
    {
      onSuccess: (data) => {
        toast.success(data?.data?.message || 'User deleted successfully!');
        queryClient.invalidateQueries('adminUsers');
        queryClient.invalidateQueries('adminStats');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || err.message || 'Failed to delete user.');
      },
    }
  );

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this user and all their data? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading users...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Error loading users.</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link to="/admin" className="text-indigo-600 dark:text-indigo-400 hover:underline">&larr; Back to Admin Dashboard</Link>
        <h1 className="text-3xl font-bold mt-2">Manage Users</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date Joined</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users?.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.role === 'admin' ? <Shield className="h-10 w-10 text-indigo-500" /> : <UserIcon className="h-10 w-10 text-gray-500" />}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : user.role === 'client' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {currentUser?.id !== user.id && (
                     <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deleteUserMutation.isLoading}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                        title="Delete User"
                     >
                       <Trash2 className="h-5 w-5" />
                     </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageUsers;