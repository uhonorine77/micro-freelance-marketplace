// client/src/pages/MyProjects.tsx
import React from 'react';
import { useQuery } from 'react-query';
import { tasksApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { TaskWithClient, UserRole } from '../types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Briefcase, Loader2 } from 'lucide-react';

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
    status === 'open' ? 'bg-green-100 text-green-800' :
    status === 'assigned' || status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
    status === 'completed' ? 'bg-purple-100 text-purple-800' :
    'bg-gray-100 text-gray-800'
  }`}>
    {status.replace('_', ' ')}
  </span>
);

const MyProjects: React.FC = () => {
  const { user } = useAuth();
  const { data: allTasks, isLoading } = useQuery(
    'allTasks',
    () => tasksApi.getAll().then((res) => res.data.data || []),
    { enabled: user?.role === UserRole.client }
  );

  const myProjects = allTasks?.filter(task => task.clientId === user?.id) || [];

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Projects</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {myProjects.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {myProjects.map((task: TaskWithClient) => (
              <li key={task.id} className="py-4">
                <Link to={`/task/${task.id}`} className="block hover:bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-700">{task.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Created on {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-gray-300" />
            <h3 className="mt-2 text-lg font-medium text-gray-800">No projects yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              <Link to="/tasks/new" className="text-indigo-600 hover:underline">Post your first project</Link> to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProjects;