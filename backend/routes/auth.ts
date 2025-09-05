// src/routes/auth.ts
import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import {
  ApiResponse,
  RegisterRequestBody,
  LoginRequestBody,
  AuthResponseData,
  AuthRequest,
  JwtPayload,
  User,
  UserRole
} from '../types'; // No .js extension

const router = express.Router();

export const createAuthRouter = (prisma: PrismaClient) => {

  router.post('/register',
    [
      body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
      body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
      body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
      body('role').isIn(Object.values(UserRole)).withMessage(`Role must be one of: ${Object.values(UserRole).join(', ')}`)
    ],
    async (req: AuthRequest<{}, ApiResponse<AuthResponseData>, RegisterRequestBody>, res: Response<ApiResponse<AuthResponseData>>): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const response: ApiResponse = {
            success: false,
            error: 'Validation failed',
            data: errors.array()
          };
          res.status(400).json(response);
          return;
        }

        const { email, password, firstName, lastName, role } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          const response: ApiResponse = {
            success: false,
            error: 'User already exists'
          };
          res.status(400).json(response);
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'isVerified'> = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role,
            isVerified: false,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isVerified: true,
          }
        });

        const jwtPayload: JwtPayload = { id: user.id, email: user.email, role: user.role };
        const token: string = jwt.sign(
          jwtPayload,
          (process.env.JWT_SECRET || 'fallback-secret') as string,
          { expiresIn: '7d' }
        );

        const response: ApiResponse<AuthResponseData> = {
          success: true,
          message: 'User registered successfully',
          data: {
            token,
            user: user
          }
        };

        res.status(201).json(response);
      } catch (error: unknown) {
        console.error('Registration error:', error);
        const response: ApiResponse = {
          success: false,
          error: (error instanceof Error) ? error.message : 'Registration failed'
        };
        res.status(500).json(response);
      }
    }
  );

  router.post('/login',
    [
      body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
      body('password').exists().withMessage('Password is required')
    ],
    async (req: AuthRequest<{}, ApiResponse<AuthResponseData>, LoginRequestBody>, res: Response<ApiResponse<AuthResponseData>>): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const response: ApiResponse = {
            success: false,
            error: 'Validation failed',
            data: errors.array()
          };
          res.status(400).json(response);
          return;
        }

        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const response: ApiResponse = {
            success: false,
            error: 'Invalid credentials'
          };
          res.status(401).json(response);
          return;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          const response: ApiResponse = {
            success: false,
            error: 'Invalid credentials'
          };
          res.status(401).json(response);
          return;
        }

        const jwtPayload: JwtPayload = { id: user.id, email: user.email, role: user.role };
        const token: string = jwt.sign(
          jwtPayload,
          (process.env.JWT_SECRET || 'fallback-secret') as string,
          { expiresIn: '7d' }
        );

        const response: ApiResponse<AuthResponseData> = {
          success: true,
          message: 'Login successful',
          data: {
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              isVerified: user.isVerified
            }
          }
        };

        res.json(response);
      } catch (error: unknown) {
        console.error('Login error:', error);
        const response: ApiResponse = {
          success: false,
          error: (error instanceof Error) ? error.message : 'Login failed'
        };
        res.status(500).json(response);
      }
    }
  );

  return router;
};