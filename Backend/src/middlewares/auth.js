import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

/**
 * Authentication Middleware
 * Validates JWT access token and re-hydrates user from DB so deactivation
 * and role changes apply immediately (brain.md Section 11).
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        401,
        'Authorization header with Bearer token is required'
      );
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        401,
        'Invalid or expired access token'
      );
    }

    // Re-load user from database
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        401,
        'Account is deactivated or does not exist'
      );
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
