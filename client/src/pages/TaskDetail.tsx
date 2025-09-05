// src/pages/TaskDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useQuery, useMutation, useQueryClient, QueryKey } from 'react-query';
import { tasksApi, bidsApi, milestonesApi, chatApi } from '../services/api';
import {
  TaskWithClient, BidWithFreelancer, Milestone, MessageWithSender,
  CreateBidPayload, CreateMilestonePayload, TaskStatus, UserRole, BidStatus, MilestoneStatus, Bid
} from '../types';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Send, MessageSquare, Briefcase, DollarSign, Calendar, Plus, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';

const bidSchema = z.object({
  amount: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive('Amount must be a positive number')
  ),
  proposal: z.string().min(30, 'Proposal must be at least 30 characters'),
  timeline: z.string().min(1, 'Timeline is required'),
});
type BidFormData = z.infer<typeof bidSchema>;

const milestoneSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description is required'),
  amount: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive('Amount must be a positive number')
  ),
  dueDate: z.string().refine((val) => !isNaN(new Date(val).getTime()), 'Invalid due date'),
});
type MilestoneFormData = z.infer<typeof milestoneSchema>;

const TaskDetail: React.FC = () => {
  const { id: taskId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const [chatMessages, setChatMessages] = useState<MessageWithSender[]>([]);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [showBidForm, setShowBidForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const {
    data: task,
    isLoading: isLoadingTask,
    isError: isErrorTask,
    error: taskError
  } = useQuery<TaskWithClient, Error, TaskWithClient, QueryKey>(
    ['task', taskId],
    async (): Promise<TaskWithClient> => {
      if (!taskId) throw new Error("Task ID is missing");
      const response = await tasksApi.getById(taskId);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch task');
      }
      return response.data.data;
    },
    { enabled: !!taskId }
  );

  const {
    data: bids,
    isLoading: isLoadingBids
  } = useQuery<BidWithFreelancer[], Error, BidWithFreelancer[], QueryKey>(
    ['bids', taskId],
    async (): Promise<BidWithFreelancer[]> => {
      if (!taskId) return [];
      const response = await bidsApi.getByTask(taskId);
      if (!response.data.success) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch bids');
      }
      return response.data.data || [];
    },
    {
      enabled: !!taskId,
      initialData: [],
    }
  );

  const {
    data: milestones,
    isLoading: isLoadingMilestones
  } = useQuery<Milestone[], Error, Milestone[], QueryKey>(
    ['milestones', taskId],
    async (): Promise<Milestone[]> => {
      if (!taskId) return [];
      const response = await milestonesApi.getByTask(taskId);
      if (!response.data.success) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch milestones');
      }
      return response.data.data || [];
    },
    {
      enabled: !!taskId,
      initialData: [],
    }
  );

  const {
    data: initialChatMessages,
    isLoading: isLoadingChat,
  } = useQuery<MessageWithSender[], Error, MessageWithSender[], QueryKey>(
    ['chatMessages', taskId],
    async (): Promise<MessageWithSender[]> => {
      if (!taskId) return [];
      const response = await chatApi.getMessagesByTask(taskId);
      if (!response.data.success) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch chat messages');
      }
      return response.data.data || [];
    },
    { enabled: !!taskId && isConnected }
  );

  useEffect(() => {
    if (socket && taskId && isConnected) {
      socket.emit('join_task', { taskId });
      socket.on('load_messages', (messages: MessageWithSender[]) => setChatMessages(messages));
      socket.on('new_message', (message: MessageWithSender) => setChatMessages((prev) => [...prev, message]));
      return () => {
        socket.off('load_messages');
        socket.off('new_message');
      };
    }
  }, [socket, taskId, isConnected]);

  useEffect(() => {
    if (initialChatMessages) {
      setChatMessages(initialChatMessages);
    }
  }, [initialChatMessages]);

  const handleSendMessage = () => {
    if (socket && isConnected && currentChatMessage.trim() && taskId) {
      socket.emit('send_message', { taskId, content: currentChatMessage });
      setCurrentChatMessage('');
    } else if (!isConnected) {
      toast.error('Not connected to chat server.');
    }
  };

  const { register: bidRegister, handleSubmit: handleBidSubmit, formState: { errors: bidErrors, isSubmitting: isSubmittingBid } } = useForm<BidFormData>({
    resolver: zodResolver(bidSchema),
  });

  const createBidMutation = useMutation<Bid, Error, CreateBidPayload>(
    (bidData) => bidsApi.create(bidData).then(res => {
      if (!res.data.success || !res.data.data) {
        throw new Error(typeof res.data.error === 'string' ? res.data.error : JSON.stringify(res.data.error));
      }
      return res.data.data;
    }),
    {
      onSuccess: (newBid) => {
        queryClient.invalidateQueries(['bids', taskId]);
        toast.success(`Bid for $${newBid.amount} submitted successfully!`);
        setShowBidForm(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to submit bid');
      }
    }
  );

  const onBidSubmit = async (data: BidFormData) => {
    if (!taskId) return;
    await createBidMutation.mutateAsync({ ...data, taskId });
  };

  const { register: milestoneRegister, handleSubmit: handleMilestoneSubmit, formState: { errors: milestoneErrors, isSubmitting: isSubmittingMilestone } } = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
  });

  const createMilestoneMutation = useMutation<Milestone, Error, CreateMilestonePayload>(
    (milestoneData) => milestonesApi.create(milestoneData).then(res => {
      if (!res.data.success || !res.data.data) {
        throw new Error(typeof res.data.error === 'string' ? res.data.error : JSON.stringify(res.data.error));
      }
      return res.data.data;
    }),
    {
      onSuccess: (newMilestone) => {
        queryClient.invalidateQueries(['milestones', taskId]);
        toast.success(`Milestone "${newMilestone.title}" created successfully!`);
        setShowMilestoneForm(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to create milestone');
      }
    }
  );

  const onMilestoneSubmit = async (data: MilestoneFormData) => {
    if (!taskId) return;
    await createMilestoneMutation.mutateAsync({ ...data, taskId, dueDate: new Date(data.dueDate).toISOString() });
  };

  if (!taskId) {
    return <div className="text-center text-red-600 p-8">No Task ID provided.</div>;
  }

  if (isLoadingTask || isLoadingBids || isLoadingMilestones || isLoadingChat) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div></div>;
  }

  if (isErrorTask || !task) {
    return (
      <div className="text-center text-red-600 p-8">
        Error loading task: {taskError instanceof Error ? taskError.message : 'Task not found.'}
        <Link to="/dashboard" className="block mt-4 text-indigo-600 hover:underline">Go back to Dashboard</Link>
      </div>
    );
  }

  const isClient = user?.role === UserRole.client && user.id === task.clientId;
  const isFreelancer = user?.role === UserRole.freelancer;
  const isAssignedToFreelancer = bids?.some((bid) => bid.status === BidStatus.accepted && bid.freelancerId === user?.id) || false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-800 flex items-center mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Link>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Posted by {task.client?.firstName} {task.client?.lastName}</span>
            <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
            <span>{format(parseISO(task.createdAt), 'MMM dd, yyyy')}</span>
            <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full ${
              task.status === TaskStatus.open ? 'bg-green-100 text-green-800' :
              task.status === TaskStatus.assigned ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700">{task.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Budget</h3>
              <p className="text-gray-700 flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" /> ${task.budget} ({task.budgetType})
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Deadline</h3>
              <p className="text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-indigo-600" /> {format(parseISO(task.deadline), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          {isFreelancer && !isAssignedToFreelancer && task.status === TaskStatus.open && (
            <div className="pt-6 border-t mt-6">
              <button
                onClick={() => setShowBidForm(!showBidForm)}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                <Briefcase className="h-5 w-5 mr-2" /> {showBidForm ? 'Cancel Bid' : 'Submit a Bid'}
              </button>
              {showBidForm && (
                <form onSubmit={handleBidSubmit(onBidSubmit)} className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md">
                  <div>
                    <label htmlFor="bid-amount" className="block text-sm font-medium text-gray-700">Your Bid Amount ($)</label>
                    <input id="bid-amount" {...bidRegister('amount')} type="number" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., 450" />
                    {bidErrors.amount && <p className="mt-1 text-sm text-red-600">{bidErrors.amount.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="bid-proposal" className="block text-sm font-medium text-gray-700">Your Proposal</label>
                    <textarea id="bid-proposal" {...bidRegister('proposal')} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="Describe your approach..."></textarea>
                    {bidErrors.proposal && <p className="mt-1 text-sm text-red-600">{bidErrors.proposal.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="bid-timeline" className="block text-sm font-medium text-gray-700">Estimated Timeline</label>
                    <input id="bid-timeline" {...bidRegister('timeline')} type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., 2 weeks" />
                    {bidErrors.timeline && <p className="mt-1 text-sm text-red-600">{bidErrors.timeline.message}</p>}
                  </div>
                  <button type="submit" disabled={isSubmittingBid || createBidMutation.isLoading} className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmittingBid || createBidMutation.isLoading ? 'Submitting...' : 'Submit Bid'}
                  </button>
                </form>
              )}
            </div>
          )}
          {isClient && task.status === TaskStatus.open && (
            <div className="pt-6 border-t mt-6">
              <button
                onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center"
              >
                <Plus className="h-5 w-5 mr-2" /> {showMilestoneForm ? 'Cancel Milestone' : 'Add Milestone'}
              </button>
              {showMilestoneForm && (
                <form onSubmit={handleMilestoneSubmit(onMilestoneSubmit)} className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md">
                  <div>
                    <label htmlFor="milestone-title" className="block text-sm font-medium text-gray-700">Milestone Title</label>
                    <input id="milestone-title" {...milestoneRegister('title')} type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Initial UI Design" />
                    {milestoneErrors.title && <p className="mt-1 text-sm text-red-600">{milestoneErrors.title.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="milestone-description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="milestone-description" {...milestoneRegister('description')} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="Details for this milestone..."></textarea>
                    {milestoneErrors.description && <p className="mt-1 text-sm text-red-600">{milestoneErrors.description.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="milestone-amount" className="block text-sm font-medium text-gray-700">Amount ($)</label>
                    <input id="milestone-amount" {...milestoneRegister('amount')} type="number" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., 100" />
                    {milestoneErrors.amount && <p className="mt-1 text-sm text-red-600">{milestoneErrors.amount.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="milestone-dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input id="milestone-dueDate" {...milestoneRegister('dueDate')} type="date" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    {milestoneErrors.dueDate && <p className="mt-1 text-sm text-red-600">{milestoneErrors.dueDate.message}</p>}
                  </div>
                  <button type="submit" disabled={isSubmittingMilestone || createMilestoneMutation.isLoading} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmittingMilestone || createMilestoneMutation.isLoading ? 'Adding...' : 'Add Milestone'}
                  </button>
                </form>
              )}
            </div>
          )}
          <div className="pt-6 border-t mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center"><Briefcase className="h-5 w-5 mr-2" /> Bids ({bids?.length || 0})</h2>
            {bids && bids.length > 0 ? (
              <ul className="space-y-4">
                {bids.map((bid) => (
                  <li key={bid.id} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold text-indigo-700">{bid.freelancer?.firstName} {bid.freelancer?.lastName}</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        bid.status === BidStatus.pending ? 'bg-yellow-100 text-yellow-800' :
                        bid.status === BidStatus.accepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-800 text-sm mb-2">${bid.amount} - {bid.timeline}</p>
                    <p className="text-gray-600 text-xs italic">{bid.proposal}</p>
                    {isClient && bid.status === BidStatus.pending && (
                        <div className="mt-3 flex space-x-2">
                            <button className="text-sm bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">Accept</button>
                            <button className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Reject</button>
                        </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-600 text-sm">No bids yet.</p>}
          </div>
          <div className="pt-6 border-t mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center"><Clock className="h-5 w-5 mr-2" /> Milestones ({milestones?.length || 0})</h2>
            {milestones && milestones.length > 0 ? (
              <ul className="space-y-4">
                {milestones.map((milestone) => (
                  <li key={milestone.id} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold text-gray-900">{milestone.title}</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        milestone.status === MilestoneStatus.pending ? 'bg-yellow-100 text-yellow-800' :
                        milestone.status === MilestoneStatus.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-800 text-sm mb-2">${milestone.amount} - Due: {format(parseISO(milestone.dueDate), 'MMM dd, yyyy')}</p>
                    <p className="text-gray-600 text-xs italic">{milestone.description}</p>
                    {isClient && (milestone.status === MilestoneStatus.pending || milestone.status === MilestoneStatus.in_progress) && (
                        <div className="mt-3">
                            <button className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Mark Complete</button>
                        </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-600 text-sm">No milestones defined yet.</p>}
          </div>
        </div>
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border p-6 flex flex-col h-[600px]">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center"><MessageSquare className="h-5 w-5 mr-2" /> Project Chat</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => (
                <div key={msg.id || index} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg ${msg.senderId === user?.id ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                    <div className="font-semibold text-xs mb-1">{msg.sender?.firstName || 'Unknown'} {msg.sender?.lastName || ''}</div>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs text-right opacity-75 mt-1">{format(parseISO(msg.createdAt), 'HH:mm')}</p>
                  </div>
                </div>
              ))
            ) : <p className="text-gray-500 text-center mt-8">No messages yet. Say hello!</p>}
          </div>
          <div className="mt-4 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <input type="text" value={currentChatMessage} onChange={(e) => setCurrentChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder={isConnected ? "Type your message..." : "Connecting to chat..."} disabled={!isConnected} />
              <button onClick={handleSendMessage} disabled={!isConnected || !currentChatMessage.trim()} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send className="h-5 w-5" />
              </button>
            </div>
            {!isConnected && <p className="text-red-500 text-sm mt-1">Chat is disconnected.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;