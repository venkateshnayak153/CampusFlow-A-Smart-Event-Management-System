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

export async function listEvents(req, res, next) {
  try {
    const result = await eventService.listPublishedEvents(req.query, req.user);
    return sendSuccess(res, result.events, 200, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function getEventById(req, res, next) {
  try {
    const event = await eventService.getEventById(req.params.id, req.user);
    return sendSuccess(res, event);
  } catch (err) {
    next(err);
  }
}

export async function listClubEvents(req, res, next) {
  try {
    const events = await eventService.listClubEvents(req.params.id, req.user._id);
    return sendSuccess(res, events);
  } catch (err) {
    next(err);
  }
}

export async function updateDraft(req, res, next) {
  try {
    const event = await eventService.updateDraft(req.params.id, req.body, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, event);
  } catch (err) {
    next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const result = await eventService.deleteDraft(req.params.id, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateVolunteers(req, res, next) {
  try {
    const event = await eventService.updateVolunteers(req.params.id, req.body.volunteerIds || [], req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      currentUser: req.user
    });
    return sendSuccess(res, event);
  } catch (err) {
    next(err);
  }
}
