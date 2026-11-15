import { eventService } from '../services/event.service.js';
import { sendSuccess } from '../utils/response.js';

export async function createDraft(req, res, next) {
  try {
    const event = await eventService.createDraft(req.body, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, event, 201);
  } catch (err) {
    next(err);
  }
}

export async function dryRunClash(req, res, next) {
  try {
    const result = await eventService.dryRunClash(req.body);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
