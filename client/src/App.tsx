// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TaskDetail from './pages/TaskDetail';
import CreateTask from './pages/CreateTask';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageTasks from './pages/admin/ManageTasks';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ThemeProvider>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected User Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/tasks/new" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
              <Route path="/task/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

              {/* Protected Admin Routes */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/users" element={<AdminProtectedRoute><ManageUsers /></AdminProtectedRoute>} />
              <Route path="/admin/tasks" element={<AdminProtectedRoute><ManageTasks /></AdminProtectedRoute>} />
            </Routes>
          </Layout>
        </ThemeProvider>
      </SocketProvider>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} theme="colored" />
    </AuthProvider>
  );
}

export default App;