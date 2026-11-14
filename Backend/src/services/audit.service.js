import { AuditLog } from '../models/AuditLog.js';
import { clockService } from './clock.service.js';
import { logger } from '../utils/logger.js';

export const auditService = {
  /**
   * Log an audit event
   * @param {Object} params
   * @param {'user'|'system'|'coordinator_link'} params.actorType
   * @param {string|null} [params.actorId]
   * @param {string} params.actorLabel
   * @param {string} params.action - One of AUDIT_ACTIONS
   * @param {'user'|'club'|'event'|'venue'|'registration'|'approval'|'checkin'} params.entityType
   * @param {string} params.entityId
   * @param {Object} [params.before]
   * @param {Object} [params.after]
   * @param {Object} [params.meta] - { requestId, ip, userAgent, reason }
   */
  async log({
    actorType,
    actorId = null,
    actorLabel,
    action,
    entityType,
    entityId,
    before = null,
    after = null,
    meta = {}
  }) {
    try {
      return await AuditLog.create({
        actorType,
        actorId,
        actorLabel,
        action,
        entityType,
        entityId,
        before,
        after,
        meta,
        createdAt: clockService.now()
      });
    } catch (err) {
      logger.error({ err, action, entityType, entityId }, 'Failed to record audit log entry');
      // Per Section 10/13, failure to write an audit entry should not silently crash or be masked
      throw err;
    }
  },

  /**
   * Query audit logs with pagination and filtering
   */
  async query({ entityType, entityId, actorId, action, from, to, page = 1, limit = 20 }) {
    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (actorId) filter.actorId = actorId;
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;

    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      AuditLog.countDocuments(filter)
    ]);

    return {
      items,
      meta: {
        page: parseInt(page, 10) || 1,
        limit: safeLimit,
        total
      }
    };
  }
};
