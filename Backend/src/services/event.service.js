import { Event } from '../models/Event.js';
import { Club } from '../models/Club.js';
import { EVENT_STATUS, CLUB_STATUS, AUDIT_ACTIONS, TUNABLE } from '../config/constants.js';
import { auditService } from './audit.service.js';
import { clockService } from './clock.service.js';
import { clashService } from './clash.service.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

export const eventService = {
  async createDraft(data, userId, meta = {}) {
    const club = await Club.findById(data.clubId);
    if (!club || club.status !== CLUB_STATUS.ACTIVE) {
      throw new AppError(ERROR_CODES.CLUB_NOT_ACTIVE, 403, 'Events can only be created for active clubs.');
    }

    if (!club.organisers.some((org) => org.toString() === userId.toString())) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'You are not an organiser of this club.');
    }

    // Derive audienceKeys
    const audienceKeys = (data.audience || []).map((a) => `${a.department}-${a.year}`);

    const requiresAdminApproval =
      (data.budget || 0) > TUNABLE.BUDGET_ADMIN_THRESHOLD || !!data.externalGuests;

    const event = await Event.create({
      ...data,
      createdBy: userId,
      status: EVENT_STATUS.DRAFT,
      audienceKeys,
      requiresAdminApproval
    });

    await auditService.log({
      actorType: 'user',
      actorId: userId,
      actorLabel: `User:${userId}`,
      action: AUDIT_ACTIONS.EVENT_CREATED,
      entityType: 'event',
      entityId: event._id,
      after: event.toObject(),
      meta
    });

    return event;
  },

  async dryRunClash(data) {
    let audienceKeys = [];
    if (data.audience) {
      audienceKeys = data.audience.map((a) => `${a.department}-${a.year}`);
    } else if (data.audienceKeys) {
      audienceKeys = data.audienceKeys;
    }

    return clashService.checkClash({
      eventId: data.eventId,
      venueId: data.venueId,
      clubId: data.clubId,
      start: data.start,
      end: data.end,
      audienceKeys,
      expectedTurnout: data.expectedTurnout,
      seatLimit: data.seatLimit
    });
  }
};
