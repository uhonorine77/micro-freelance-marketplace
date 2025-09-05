// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponseData, User, RegisterPayload, LoginPayload } from '../types'; // Import RegisterPayload and LoginPayload
import { authApi } from '../services/api';
import { AxiosError } from 'axios';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginPayload) => Promise<void>; // Updated to accept LoginPayload
  register: (userData: RegisterPayload) => Promise<void>; // Updated to accept RegisterPayload
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      }
    } catch (error) {
      console.error("Failed to parse user from local storage:", error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginPayload) => { // Accept LoginPayload
    try {
      const response = await authApi.login(credentials);
      const { token: newToken, user: newUser } = response.data.data as AuthResponseData;

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response) {
        throw error.response.data;
      }
      throw new Error('An unexpected error occurred during login.');
    }
  };

  const register = async (userData: RegisterPayload) => { // Accept RegisterPayload
    try {
      const response = await authApi.register(userData);
      const { token: newToken, user: newUser } = response.data.data as AuthResponseData;

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response) {
        throw error.response.data;
      }
      throw new Error('An unexpected error occurred during registration.');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // window.location.replace('/login'); // Optional: Force redirect on logout
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};