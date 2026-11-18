import { Venue } from '../models/Venue.js';
import { Event } from '../models/Event.js';
import { ACTIVE_STATUSES, AUDIT_ACTIONS } from '../config/constants.js';
import { auditService } from './audit.service.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

export const venueService = {
  async listActiveVenues() {
    return Venue.find({ isActive: true }).sort({ name: 1 });
  },

  async createVenue(data, actorId, meta = {}) {
    const venue = await Venue.create(data);
    await auditService.log({
      actorType: 'user',
      actorId,
      actorLabel: `User:${actorId}`,
      action: AUDIT_ACTIONS.VENUE_CREATED,
      entityType: 'venue',
      entityId: venue._id,
      after: venue.toObject(),
      meta
    });
    return venue;
  },

  async getAvailability(venueId, dateStr) {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Venue not found');
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const events = await Event.find({
      venueId,
      status: { $in: ACTIVE_STATUSES },
      start: { $lt: endOfDay },
      end: { $gt: startOfDay }
    }).select('title start end status clubId');

    return {
      venue: { id: venue._id, name: venue.name, capacity: venue.capacity },
      date: dateStr,
      busySlots: events.map((e) => ({
        id: e._id,
        title: e.title,
        start: e.start,
        end: e.end,
        status: e.status
      }))
    };
  },

  async updateVenue(venueId, updates, actorId, meta = {}) {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Venue not found');
    }

    const before = venue.toObject();

    if (updates.name !== undefined) venue.name = updates.name;
    if (updates.building !== undefined) venue.building = updates.building;
    if (updates.capacity !== undefined) venue.capacity = updates.capacity;
    if (updates.facilities !== undefined) venue.facilities = updates.facilities;
    if (updates.isActive !== undefined) venue.isActive = updates.isActive;

    await venue.save();

    await auditService.log({
      actorType: 'user',
      actorId,
      actorLabel: `Admin:${actorId}`,
      action: AUDIT_ACTIONS.VENUE_UPDATED,
      entityType: 'venue',
      entityId: venue._id,
      before,
      after: venue.toObject(),
      meta
    });

    return venue;
  }
};
