import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { clockService } from './clock.service.js';
import { auditService } from './audit.service.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';
import { AUDIT_ACTIONS, ROLES } from '../config/constants.js';

export const authService = {
  /**
   * Register a new student account
   */
  async register({ name, email, password, usn, department, year }) {
    // 1. Verify email domain matches ALLOWED_EMAIL_DOMAINS
    const domain = email.split('@')[1]?.toLowerCase();
    if (!env.ALLOWED_EMAIL_DOMAINS.includes(domain)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        `Email domain must be one of: ${env.ALLOWED_EMAIL_DOMAINS.join(', ')}`
      );
    }

    // 2. Check existing user
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError(ERROR_CODES.CONFLICT, 409, 'An account with this email already exists.');
    }

    // 3. Hash password (bcrypt cost 12 per Section 11)
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: ROLES.STUDENT,
      usn,
      department,
      year,
      isActive: true
    });

    // 5. Audit log
    await auditService.log({
      actorType: 'user',
      actorId: user._id,
      actorLabel: user.email,
      action: AUDIT_ACTIONS.USER_REGISTERED,
      entityType: 'user',
      entityId: user._id
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      year: user.year
    };
  },

  /**
   * Login user with email & password, returning JWT and user details
   */
  async login({ email, password, meta = {} }) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user || !user.isActive) {
      await auditService.log({
        actorType: 'user',
        actorId: user?._id || null,
        actorLabel: email,
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: 'user',
        entityId: user?._id || null,
        meta: { reason: 'Account invalid or inactive', ...meta }
      });
      // Generic message to prevent user enumeration
      throw new AppError(ERROR_CODES.UNAUTHENTICATED, 401, 'Invalid email or password');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      await auditService.log({
        actorType: 'user',
        actorId: user._id,
        actorLabel: user.email,
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: 'user',
        entityId: user._id,
        meta: { reason: 'Password mismatch', ...meta }
      });
      throw new AppError(ERROR_CODES.UNAUTHENTICATED, 401, 'Invalid email or password');
    }

    user.lastLoginAt = clockService.now();
    await user.save();

    // Payload holds only sub and role (Section 11)
    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    await auditService.log({
      actorType: 'user',
      actorId: user._id,
      actorLabel: user.email,
      action: AUDIT_ACTIONS.USER_LOGIN,
      entityType: 'user',
      entityId: user._id,
      meta
    });

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year
      }
    };
  },

  /**
   * Change user password
   */
  async changePassword({ userId, currentPassword, newPassword, meta = {} }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'User not found');
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppError(ERROR_CODES.UNAUTHENTICATED, 401, 'Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    await auditService.log({
      actorType: 'user',
      actorId: user._id,
      actorLabel: user.email,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'user',
      entityId: user._id,
      meta
    });

    return { message: 'Password changed successfully' };
  }
};
