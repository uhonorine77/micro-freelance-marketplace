// src/middleware/auth.ts
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse, AuthRequest, JwtPayload, UserRole } from '../types'; // No .js extension

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'Access token required'
    };
    res.status(401).json(response);
    return;
  }

  jwt.verify(token, (process.env.JWT_SECRET || 'fallback-secret') as string, (err, decoded) => {
    if (err) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired token'
      };
      res.status(403).json(response);
      return;
    }

    req.user = decoded as JwtPayload;
    next();
  });
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions'
      };
      res.status(403).json(response);
      return;
    }
    next();
  };
};