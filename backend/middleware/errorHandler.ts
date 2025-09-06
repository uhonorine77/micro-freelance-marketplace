// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err); // Log the full error for debugging

  const response: ApiResponse = {
    success: false,
    error: err.message || 'Internal server error'
  };

  if (err.name === 'ValidationError') {
    res.status(400).json(response);
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json(response);
    return;
  }

  res.status(500).json(response);
};