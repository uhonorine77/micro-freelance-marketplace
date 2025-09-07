import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { tasksApi, bidsApi, milestonesApi } from "../services/api";
import {
  TaskWithClient,
  BidWithFreelancer,
  Milestone,
  MessageWithSender,
  CreateBidPayload,
  CreateMilestonePayload,
  TaskStatus,
  UserRole,
  BidStatus,
  MilestoneStatus,
  ApiResponse,
} from "../types";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Briefcase,
  DollarSign,
  Calendar,
  Plus,
  UserCheck,
  Award,
  ShieldCheck,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { AxiosError, AxiosResponse } from "axios";

// --- Zod Schemas for Forms ---
const bidSchema = z.object({
  amount: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive("Amount must be positive")
  ),
  proposal: z.string().min(30, "Proposal must be at least 30 characters"),
  timeline: z.string().min(1, "Timeline is required"),
});
type BidFormData = z.infer<typeof bidSchema>;

const milestoneSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description is required"),
  amount: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive("Amount must be positive")
  ),
  dueDate: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), "Invalid due date"),
});
type MilestoneFormData = z.infer<typeof milestoneSchema>;

// --- Helper Components ---
const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const styles = {
    [TaskStatus.open]: "bg-green-100 text-green-800",
    [TaskStatus.assigned]: "bg-blue-100 text-blue-800",
    [TaskStatus.in_progress]: "bg-yellow-100 text-yellow-800",
    [TaskStatus.completed]: "bg-purple-100 text-purple-800",
    [TaskStatus.cancelled]: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`ml-auto px-2 py-1 text-xs font-medium rounded-full uppercase ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
};

const TaskDetailSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
    <div className="h-6 w-48 bg-gray-200 rounded-md mb-6"></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6 space-y-6">
        <div className="h-9 w-3/4 bg-gray-300 rounded-md"></div>
        <div className="h-5 w-1/2 bg-gray-200 rounded-md"></div>
        <div className="h-20 w-full bg-gray-200 rounded-md mt-4"></div>
      </div>
      <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border p-6">
        <div className="h-7 w-1/3 bg-gray-300 rounded-md"></div>
      </div>
    </div>
  </div>
);

const TaskDetail: React.FC = () => {
  const { id: taskId } = useParams<{ id: string }>();
  if (!taskId) throw new Error("Task ID is required.");

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [isChatActive, setIsChatActive] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const { data: task, isLoading: isLoadingTask } = useQuery<
    TaskWithClient,
    AxiosError
  >(
    ["task", taskId],
    () => tasksApi.getById(taskId).then((res) => res.data.data!),
    { onSuccess: (data) => setIsChatActive(data.status !== TaskStatus.open) }
  );
  const { data: bids = [] } = useQuery<BidWithFreelancer[], AxiosError>(
    ["bids", taskId],
    () => bidsApi.getByTask(taskId).then((res) => res.data.data!)
  );
  const { data: milestones = [] } = useQuery<Milestone[], AxiosError>(
    ["milestones", taskId],
    () => milestonesApi.getByTask(taskId).then((res) => res.data.data!)
  );

  const isClient = user?.id === task?.clientId;
  const assignedFreelancer = bids.find((b) => b.status === BidStatus.accepted);
  const isAssignedFreelancer = user?.id === assignedFreelancer?.freelancerId;
  const canChat =
    isConnected && isChatActive && (isClient || isAssignedFreelancer);

  useEffect(() => {
    if (socket && taskId) {
      socket.emit("join_task", { taskId });

      const handleLoadMessages = (history: MessageWithSender[]) =>
        setMessages(history);
      const handleNewMessage = (newMessage: MessageWithSender) =>
        setMessages((prev) => [...prev, newMessage]);
      const handleChatActivated = () => {
        toast.info("Chat is now active!");
        setIsChatActive(true);
      };
      const handleUserTyping = ({
        userId,
        isTyping,
      }: {
        userId: string;
        isTyping: boolean;
      }) => {
        setTypingUsers((prev) =>
          isTyping ? [...prev, userId] : prev.filter((id) => id !== userId)
        );
      };

      socket.on("load_messages", handleLoadMessages);
      socket.on("new_message", handleNewMessage);
      socket.on("chat_activated", handleChatActivated);
      socket.on("user_typing", handleUserTyping);

      return () => {
        socket.emit("leave_task", { taskId });
        socket.off("load_messages", handleLoadMessages);
        socket.off("new_message", handleNewMessage);
        socket.off("chat_activated", handleChatActivated);
        socket.off("user_typing", handleUserTyping);
      };
    }
  }, [socket, taskId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getErrorMessage = (error: ApiResponse["error"]): string => {
    if (typeof error === "string") {
      return error;
    } else if (Array.isArray(error)) {
      return error.map((e: any) => e.message || JSON.stringify(e)).join("; ");
    } else {
      return "An unknown error occurred";
    }
  };

  // --- CORRECTED MUTATION HOOKS ---
  const useTaskMutations = () => {
    const invalidateAllQueries = () => {
      queryClient.invalidateQueries(["task", taskId]);
      queryClient.invalidateQueries(["bids", taskId]);
      queryClient.invalidateQueries(["milestones", taskId]);
    };

    const acceptBidMutation = useMutation<
      AxiosResponse<ApiResponse>,
      AxiosError<ApiResponse>,
      string
    >(bidsApi.accept, {
      onSuccess: invalidateAllQueries,
      onError: (err) => {
        const error = err.response?.data?.error;
        toast.error(getErrorMessage(error) || "Failed to accept bid.");
      },
    });

    const milestoneCompletionMutation = useMutation<
      AxiosResponse<ApiResponse<Milestone>>,
      AxiosError<ApiResponse>,
      string
    >(milestonesApi.requestCompletion, {
      onSuccess: invalidateAllQueries,
      onError: (err) => {
        const error = err.response?.data?.error;
        toast.error(getErrorMessage(error) || "Failed to mark as complete.");
      },
    });

    const releasePaymentMutation = useMutation<
      AxiosResponse<ApiResponse<Milestone>>,
      AxiosError<ApiResponse>,
      string
    >(milestonesApi.releasePayment, {
      onSuccess: invalidateAllQueries,
      onError: (err) => {
        const error = err.response?.data?.error;
        toast.error(getErrorMessage(error) || "Failed to release payment.");
      },
    });

    return {
      acceptBidMutation,
      milestoneCompletionMutation,
      releasePaymentMutation,
    };
  };
  const {
    acceptBidMutation,
    milestoneCompletionMutation,
    releasePaymentMutation,
  } = useTaskMutations();

  // --- CORRECTED FORM HANDLING & MUTATIONS ---
  const {
    register: bidRegister,
    handleSubmit: handleBidSubmit,
    reset: resetBidForm,
    formState: { errors: bidErrors },
  } = useForm<BidFormData>({ resolver: zodResolver(bidSchema) });
  const bidMutation = useMutation<
    AxiosResponse<ApiResponse>,
    AxiosError<ApiResponse>,
    CreateBidPayload
  >((data: CreateBidPayload) => bidsApi.create(data), {
    onSuccess: () => {
      toast.success("Bid submitted successfully!");
      queryClient.invalidateQueries(["bids", taskId]);
      resetBidForm();
    },
    onError: (err) => {
      const error = err.response?.data?.error;
      toast.error(getErrorMessage(error) || "Failed to submit bid.");
    },
  });

  const onBidSubmit = (data: BidFormData) =>
    bidMutation.mutate({ ...data, taskId });

  const {
    register: milestoneRegister,
    handleSubmit: handleMilestoneSubmit,
    reset: resetMilestoneForm,
    formState: { errors: milestoneErrors },
  } = useForm<MilestoneFormData>({ resolver: zodResolver(milestoneSchema) });
  const milestoneMutation = useMutation<
    AxiosResponse<ApiResponse>,
    AxiosError<ApiResponse>,
    CreateMilestonePayload
  >((data: CreateMilestonePayload) => milestonesApi.create(data), {
    onSuccess: () => {
      toast.success("Milestone created!");
      queryClient.invalidateQueries(["milestones", taskId]);
      resetMilestoneForm();
    },
    onError: (err) => {
      const error = err.response?.data?.error;
      toast.error(getErrorMessage(error) || "Failed to create milestone.");
    },
  });

  const onMilestoneSubmit = (data: MilestoneFormData) =>
    milestoneMutation.mutate({
      ...data,
      taskId,
      dueDate: new Date(data.dueDate).toISOString(),
    });

  const handleSendMessage = () => {
    if (socket && canChat && chatMessage.trim()) {
      socket.emit("send_message", { taskId, content: chatMessage });
      setChatMessage("");
    }
  };

  const handleAcceptBid = (bidId: string) => {
    if (
      window.confirm(
        "Are you sure you want to hire this freelancer? This will start the project and lock the bids."
      )
    ) {
      acceptBidMutation.mutate(bidId);
    }
  };

  if (isLoadingTask) return <TaskDetailSkeleton />;
  if (!task)
    return <div className="text-center p-8 text-red-500">Task not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/dashboard"
        className="text-indigo-600 hover:text-indigo-800 flex items-center mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Link>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6 space-y-8">
          <div>
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
              <StatusBadge status={task.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Posted by {task.client?.firstName} {task.client?.lastName} on{" "}
              {format(parseISO(task.createdAt), "MMM dd, yyyy")}
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Project Details
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
            <div className="flex items-center text-gray-700">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />{" "}
              <strong>Budget:</strong>
              <span className="ml-2">
                ${task.budget} ({task.budgetType})
              </span>
            </div>
            <div className="flex items-center text-gray-700">
              <Calendar className="h-5 w-5 mr-2 text-indigo-600" />{" "}
              <strong>Deadline:</strong>
              <span className="ml-2">
                {format(parseISO(task.deadline), "MMM dd, yyyy")}
              </span>
            </div>
          </div>

          {task.status === TaskStatus.open && (
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" /> Bids ({bids.length})
              </h2>
              {bids.length > 0 ? (
                bids.map((bid) => (
                  <div
                    key={bid.id}
                    className="bg-gray-50 p-4 rounded-md border mb-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-indigo-700">
                          {bid.freelancer?.firstName} {bid.freelancer?.lastName}
                        </p>
                        <p className="text-gray-800 text-sm font-bold">
                          ${bid.amount}{" "}
                          <span className="font-normal text-gray-600">
                            - {bid.timeline}
                          </span>
                        </p>
                      </div>
                      {isClient && (
                        <button
                          onClick={() => handleAcceptBid(bid.id)}
                          disabled={acceptBidMutation.isLoading}
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          <UserCheck className="h-4 w-4 inline-block mr-1" />{" "}
                          Hire
                        </button>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-2 italic">
                      "{bid.proposal}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-sm">No bids yet.</p>
              )}
              {user?.role === UserRole.freelancer &&
                !bids.some((b) => b.freelancerId === user.id) && (
                  <form
                    onSubmit={handleBidSubmit(onBidSubmit)}
                    className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md border"
                  >
                    <h3 className="font-semibold text-gray-700">
                      Submit Your Bid
                    </h3>
                    {/* --- CORRECTED ERROR DISPLAY --- */}
                    <div>
                      <input
                        {...bidRegister("amount")}
                        type="number"
                        step="0.01"
                        className="w-full p-2 border rounded-md"
                        placeholder="Your bid amount ($)"
                      />
                      <p className="text-sm text-red-500 mt-1">
                        {bidErrors.amount?.message}
                      </p>
                    </div>
                    <div>
                      <textarea
                        {...bidRegister("proposal")}
                        rows={3}
                        className="w-full p-2 border rounded-md"
                        placeholder="Your proposal..."
                      ></textarea>
                      <p className="text-sm text-red-500 mt-1">
                        {bidErrors.proposal?.message}
                      </p>
                    </div>
                    <div>
                      <input
                        {...bidRegister("timeline")}
                        type="text"
                        className="w-full p-2 border rounded-md"
                        placeholder="Estimated timeline (e.g., 2 weeks)"
                      />
                      <p className="text-sm text-red-500 mt-1">
                        {bidErrors.timeline?.message}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={bidMutation.isLoading}
                      className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Submit Bid
                    </button>
                  </form>
                )}
            </div>
          )}

          {task.status !== TaskStatus.open && (
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-600" /> Milestones
              </h2>
              {milestones.length > 0 ? (
                milestones.map((m) => (
                  <div
                    key={m.id}
                    className="bg-gray-50 p-4 rounded-md border mb-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {m.title} -{" "}
                          <span className="font-bold text-green-700">
                            ${m.amount}
                          </span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {format(parseISO(m.dueDate), "MMM dd, yyyy")}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {m.description}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full capitalize bg-${
                            m.status === MilestoneStatus.paid
                              ? "green"
                              : m.status === MilestoneStatus.completed
                              ? "blue"
                              : "yellow"
                          }-100 text-${
                            m.status === MilestoneStatus.paid
                              ? "green"
                              : m.status === MilestoneStatus.completed
                              ? "blue"
                              : "yellow"
                          }-800`}
                        >
                          {m.status.replace("_", " ")}
                        </span>
                        {isAssignedFreelancer &&
                          m.status === MilestoneStatus.pending && (
                            <button
                              onClick={() =>
                                milestoneCompletionMutation.mutate(m.id)
                              }
                              className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 w-full"
                            >
                              Mark as Complete
                            </button>
                          )}
                        {isClient && m.status === MilestoneStatus.completed && (
                          <button
                            onClick={() => releasePaymentMutation.mutate(m.id)}
                            className="mt-2 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 w-full"
                          >
                            Release Payment
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-sm">
                  No milestones defined yet.
                </p>
              )}
              {isClient && (
                <form
                  onSubmit={handleMilestoneSubmit(onMilestoneSubmit)}
                  className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md border"
                >
                  <h3 className="font-semibold text-gray-700 flex items-center">
                    <Plus className="h-4 w-4 mr-1" /> Add a New Milestone
                  </h3>
                  {/* --- CORRECTED ERROR DISPLAY --- */}
                  <div>
                    <input
                      {...milestoneRegister("title")}
                      className="w-full p-2 border rounded-md"
                      placeholder="Milestone Title"
                    />
                    <p className="text-sm text-red-500 mt-1">
                      {milestoneErrors.title?.message}
                    </p>
                  </div>
                  <div>
                    <textarea
                      {...milestoneRegister("description")}
                      rows={2}
                      className="w-full p-2 border rounded-md"
                      placeholder="Description of deliverables"
                    ></textarea>
                    <p className="text-sm text-red-500 mt-1">
                      {milestoneErrors.description?.message}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        {...milestoneRegister("amount")}
                        type="number"
                        step="0.01"
                        className="w-full p-2 border rounded-md"
                        placeholder="Amount ($)"
                      />
                      <p className="text-sm text-red-500 mt-1">
                        {milestoneErrors.amount?.message}
                      </p>
                    </div>
                    <div>
                      <input
                        {...milestoneRegister("dueDate")}
                        type="date"
                        className="w-full p-2 border rounded-md"
                      />
                      <p className="text-sm text-red-500 mt-1">
                        {milestoneErrors.dueDate?.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={milestoneMutation.isLoading}
                    className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add Milestone
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border p-6 flex flex-col h-[700px]">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" /> Project Chat
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 border-t pt-4">
            {!isChatActive ? (
              <div className="text-center text-gray-500 pt-16">
                <ShieldCheck className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <h3 className="font-semibold">Private Chat</h3>
                <p>
                  Hire a freelancer to begin a private conversation about the
                  project.
                </p>
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.senderId === user?.id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.senderId === user?.id
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <div className="font-semibold text-xs mb-1">
                      {msg.sender?.firstName} {msg.sender?.lastName}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs text-right opacity-75 mt-1">
                      {format(parseISO(msg.createdAt), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center mt-8">
                No messages yet. Say hello!
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="mt-4 flex-shrink-0">
            {typingUsers.length > 0 && (
              <p className="text-xs text-gray-500 italic mb-1">
                A user is typing...
              </p>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                placeholder={
                  canChat ? "Type your message..." : "Chat is unavailable"
                }
                disabled={!canChat}
              />
              <button
                onClick={handleSendMessage}
                disabled={!canChat || !chatMessage.trim()}
                className="bg-indigo-600 text-white p-2.5 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            {!isConnected && (
              <p className="text-red-500 text-sm mt-1">
                Disconnected from chat server.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
