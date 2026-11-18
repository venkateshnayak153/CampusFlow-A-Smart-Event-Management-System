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
  },

  async listPublishedEvents(filters = {}, currentUser = null) {
    const query = { status: EVENT_STATUS.PUBLISHED };

    if (filters.venueId) query.venueId = filters.venueId;
    if (filters.clubId) query.clubId = filters.clubId;
    if (filters.from || filters.to) {
      query.start = {};
      if (filters.from) query.start.$gte = new Date(filters.from);
      if (filters.to) query.start.$lte = new Date(filters.to);
    }
    if (filters.audience) {
      query.audienceKeys = filters.audience;
    }
    if (filters.q) {
      query.title = { $regex: filters.q, $options: 'i' };
    }

    const safeLimit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);
    const skip = (Math.max(parseInt(filters.page, 10) || 1, 1) - 1) * safeLimit;

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('clubId', 'name department')
        .populate('venueId', 'name building capacity')
        .sort({ start: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Event.countDocuments(query)
    ]);

    // Add audience-eligible flag for students
    let studentKey = null;
    if (currentUser && currentUser.department && currentUser.year) {
      studentKey = `${currentUser.department}-${currentUser.year}`;
    }

    const formattedEvents = events.map((ev) => ({
      ...ev,
      isEligible: studentKey ? (ev.audienceKeys || []).includes(studentKey) : true
    }));

    return {
      events: formattedEvents,
      meta: { page: parseInt(filters.page, 10) || 1, limit: safeLimit, total }
    };
  },

  async getEventById(eventId, currentUser = null) {
    const event = await Event.findById(eventId)
      .populate('clubId', 'name department organisers facultyCoordinators')
      .populate('venueId', 'name building capacity facilities')
      .populate('createdBy', 'name email');

    if (!event) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Event not found');
    }

    if (event.status !== EVENT_STATUS.PUBLISHED) {
      if (!currentUser) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Event not found');
      }

      const isOrganiser = (event.clubId?.organisers || []).some(
        (org) => org.toString() === currentUser._id.toString()
      );
      const isCoordinator = (event.clubId?.facultyCoordinators || []).some(
        (c) => c.email.toLowerCase() === currentUser.email?.toLowerCase()
      );
      const isAdmin = currentUser.role === 'admin';

      if (!isOrganiser && !isCoordinator && !isAdmin) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Event not found');
      }
    }

    return event;
  },

  async listClubEvents(clubId, userId) {
    const club = await Club.findById(clubId);
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    return Event.find({ clubId })
      .populate('venueId', 'name capacity')
      .sort({ createdAt: -1 });
  },

  async updateDraft(eventId, updates, userId, meta = {}) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Event not found');
    }

    if (event.status !== EVENT_STATUS.DRAFT) {
      throw new AppError(ERROR_CODES.INVALID_TRANSITION, 409, 'Only draft events can be modified.');
    }

    const club = await Club.findById(event.clubId);
    if (!club.organisers.some((org) => org.toString() === userId.toString())) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'You are not an organiser of this club.');
    }

    const before = event.toObject();

    if (updates.title) event.title = updates.title;
    if (updates.description !== undefined) event.description = updates.description;
    if (updates.type) event.type = updates.type;
    if (updates.venueId) event.venueId = updates.venueId;
    if (updates.start) event.start = new Date(updates.start);
    if (updates.end) event.end = new Date(updates.end);
    if (updates.expectedTurnout !== undefined) event.expectedTurnout = updates.expectedTurnout;
    if (updates.seatLimit !== undefined) event.seatLimit = updates.seatLimit;
    if (updates.budget !== undefined) event.budget = updates.budget;
    if (updates.externalGuests !== undefined) event.externalGuests = updates.externalGuests;
    if (updates.guestDetails !== undefined) event.guestDetails = updates.guestDetails;

    if (updates.audience) {
      event.audience = updates.audience;
      event.audienceKeys = updates.audience.map((a) => `${a.department}-${a.year}`);
    }

    event.requiresAdminApproval =
      (event.budget || 0) > TUNABLE.BUDGET_ADMIN_THRESHOLD || !!event.externalGuests;

    await event.save();

    await auditService.log({
      actorType: 'user',
      actorId: userId,
      actorLabel: `User:${userId}`,
      action: AUDIT_ACTIONS.EVENT_UPDATED,
      entityType: 'event',
      entityId: event._id,
      before,
      after: event.toObject(),
      meta
    });

    return event;
  },

  async deleteDraft(eventId, userId, meta = {}) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Event not found');
    }

    if (event.status !== EVENT_STATUS.DRAFT) {
      throw new AppError(ERROR_CODES.INVALID_TRANSITION, 409, 'Only draft events can be deleted.');
    }

    const club = await Club.findById(event.clubId);
    if (!club.organisers.some((org) => org.toString() === userId.toString())) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'You are not an organiser of this club.');
    }

    await Event.findByIdAndDelete(eventId);

    await auditService.log({
      actorType: 'user',
      actorId: userId,
      actorLabel: `User:${userId}`,
      action: AUDIT_ACTIONS.EVENT_DELETED,
      entityType: 'event',
      entityId: eventId,
      before: event.toObject(),
      meta
    });

    return { message: 'Draft event deleted successfully' };
  },

  async updateVolunteers(eventId, volunteerIds, userId, meta = {}) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Event not found');
    }

    const club = await Club.findById(event.clubId);
    const isOrganiser = club.organisers.some((org) => org.toString() === userId.toString());
    const user = meta.currentUser;
    const isAdmin = user && user.role === 'admin';

    if (!isOrganiser && !isAdmin) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'Unauthorized to manage volunteers for this event.');
    }

    event.volunteers = volunteerIds;
    await event.save();

    await auditService.log({
      actorType: 'user',
      actorId: userId,
      actorLabel: `User:${userId}`,
      action: 'EVENT_VOLUNTEERS_UPDATED',
      entityType: 'event',
      entityId: event._id,
      after: { volunteers: volunteerIds },
      meta
    });

    return event;
  }
};
