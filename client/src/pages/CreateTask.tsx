// src/pages/CreateTask.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { tasksApi } from '../services/api';
import { CreateTaskPayload, TaskCategory, BudgetType, Task, UserRole } from '../types';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(30, 'Description must be at least 30 characters'),
  category: z.nativeEnum(TaskCategory, { required_error: 'Category is required' }),
  budget: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive('Budget must be a positive number')
  ),
  budgetType: z.nativeEnum(BudgetType, { required_error: 'Budget type is required' }),
  deadline: z.string().refine((val) => !isNaN(new Date(val).getTime()), 'Invalid deadline date'),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

const CreateTask: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      budgetType: BudgetType.fixed,
      category: TaskCategory.web_development
    }
  });

  const createTaskMutation = useMutation<Task, Error, CreateTaskPayload>(
    (taskData) => tasksApi.create(taskData).then(res => {
      if (!res.data.success || !res.data.data) {
        throw new Error(typeof res.data.error === 'string' ? res.data.error : JSON.stringify(res.data.error));
      }
      return res.data.data;
    }),
    {
      onSuccess: (newTask) => {
        queryClient.invalidateQueries('tasks');
        toast.success(`Task "${newTask.title}" created successfully!`);
        navigate('/dashboard');
      },
      onError: (err: Error) => {
        const errorMessage = err.message || 'Failed to create task';
        setError(errorMessage);
        toast.error(errorMessage);
      },
    }
  );

  const onSubmit = async (data: CreateTaskFormData) => {
    setError(null);
    if (user?.role !== UserRole.client) {
      setError('Only clients can post tasks.');
      toast.error('Only clients can post tasks.');
      return;
    }

    try {
      const payload: CreateTaskPayload = {
        ...data,
        deadline: new Date(data.deadline).toISOString(),
      };
      await createTaskMutation.mutateAsync(payload);
    } catch (e) {
      // Error is handled by react-query's onError callback
    }
  };

  if (user?.role !== UserRole.client) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600 mt-2">Only clients are authorized to post tasks.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Post a New Project</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-lg shadow-sm border space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Project Title
          </label>
          <input
            id="title"
            {...register('title')}
            type="text"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Build a responsive e-commerce website"
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={5}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Provide a detailed description of your project..."
          ></textarea>
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category"
            {...register('category')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {Object.values(TaskCategory).map((cat: TaskCategory) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
              Budget
            </label>
            <input
              id="budget"
              {...register('budget')}
              type="number"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., 500"
            />
            {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget.message}</p>}
          </div>

          <div>
            <label htmlFor="budgetType" className="block text-sm font-medium text-gray-700">
              Budget Type
            </label>
            <select
              id="budgetType"
              {...register('budgetType')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {Object.values(BudgetType).map((type: BudgetType) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.budgetType && <p className="mt-1 text-sm text-red-600">{errors.budgetType.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
            Deadline
          </label>
          <input
            id="deadline"
            {...register('deadline')}
            type="date"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.deadline && <p className="mt-1 text-sm text-red-600">{errors.deadline.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || createTaskMutation.isLoading}
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || createTaskMutation.isLoading ? 'Posting...' : 'Post Project'}
        </button>
      </form>
    </div>
  );
};

export default CreateTask;