// src/contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuth(); // User object is now correctly typed from AuthContext

  useEffect(() => {
    // Only attempt to connect if both token and user are available
    if (token && user) {
      // IMPORTANT: Ensure this URL and PORT match your backend's Socket.IO server
      // Your backend runs on PORT 3003, and Socket.IO is attached to the same HTTP server.
      const newSocket = io('http://localhost:3003', { // Corrected port from 3001 to 3003
        auth: {
          token
        },
        // Optional: Add transport options if you face connection issues
        // transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket.IO: Connected to server');
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket.IO: Disconnected from server');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.IO Connection Error:', error);
        // Handle specific connection errors, e.g., invalid token
        if (error.message === 'Authentication error: Invalid or expired token') {
            console.error('Authentication failed for Socket.IO, consider re-logging.');
            // Optionally trigger logout or show a specific message
        }
      });

      setSocket(newSocket);

      // Clean up on component unmount or when token/user change
      return () => {
        console.log('Socket.IO: Cleaning up socket connection');
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('connect_error');
        newSocket.close();
      };
    } else {
      // If token or user is not available, ensure socket is closed
      if (socket) {
        console.log('Socket.IO: Closing existing socket due to missing auth');
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [token, user]); // Re-run effect when token or user changes

  const value = {
    socket,
    isConnected,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};