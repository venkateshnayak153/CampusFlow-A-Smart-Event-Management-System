import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS, ROLES } from '../config/constants.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

export const userService = {
  async listUsers({ role, department, q, page = 1, limit = 20 }) {
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { usn: { $regex: q, $options: 'i' } }
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      User.countDocuments(filter)
    ]);

    return {
      users,
      meta: { page: parseInt(page, 10) || 1, limit: safeLimit, total }
    };
  },

  async createUserByAdmin(data, adminId, meta = {}) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      ...data,
      passwordHash
    });

    await auditService.log({
      actorType: 'user',
      actorId: adminId,
      actorLabel: `Admin:${adminId}`,
      action: AUDIT_ACTIONS.USER_REGISTERED,
      entityType: 'user',
      entityId: user._id,
      meta
    });

    return user;
  }
};
