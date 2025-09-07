// client/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TaskDetail from "./pages/TaskDetail";
import CreateTask from "./pages/CreateTask";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageTasks from "./pages/admin/ManageTasks";
import CheckEmail from "./pages/auth/CheckEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import BrowseTasks from "./pages/BrowseTasks";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* --- CORRECTED ROUTING STRUCTURE --- */}

          {/* Public and Auth Routes are top-level */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />

          {/* Protected Routes are nested within a parent Route that renders the DashboardLayout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks/browse" element={<BrowseTasks />} />
            <Route path="/tasks/new" element={<CreateTask />} />
            <Route path="/task/:id" element={<TaskDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/tasks/my-projects"
              element={
                <div className="text-center p-8">
                  My Projects Page - Coming Soon!
                </div>
              }
            />
            <Route
              path="/tasks/my-bids"
              element={
                <div className="text-center p-8">
                  My Bids Page - Coming Soon!
                </div>
              }
            />
            <Route
              path="/settings"
              element={
                <div className="text-center p-8">
                  Settings Page - Coming Soon!
                </div>
              }
            />
          </Route>

          {/* Admin Routes are also nested to reuse the same layout */}
          <Route
            element={
              <AdminProtectedRoute>
                <DashboardLayout />
              </AdminProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/tasks" element={<ManageTasks />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          theme="colored"
        />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
