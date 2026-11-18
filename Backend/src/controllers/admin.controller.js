import { auditService } from '../services/audit.service.js';
import { sendSuccess } from '../utils/response.js';

export async function getAuditLogs(req, res, next) {
  try {
    const result = await auditService.query(req.query);
    return sendSuccess(res, result.items, 200, result.meta);
  } catch (err) {
    next(err);
  }
}
