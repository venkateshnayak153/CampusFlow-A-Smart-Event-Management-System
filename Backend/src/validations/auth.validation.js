import { z } from 'zod';
import { TUNABLE } from '../config/constants.js';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  usn: z.string().min(5).max(20).optional(),
  department: z.enum(TUNABLE.DEPARTMENTS).optional(),
  year: z.number().int().min(1).max(4).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});
