import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { ACTIVE_STATUSES, TUNABLE } from '../config/constants.js';

export const clashService = {
  /**
   * Check for clashes across venue, organiser, audience, and capacity
   * Sourced directly from brain.md Section 8.1
   */
  async checkClash({
    eventId = null,
    venueId,
    clubId,
    start,
    end,
    audienceKeys,
    expectedTurnout,
    seatLimit
  }) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const venue = await Venue.findById(venueId);
    if (!venue || !venue.isActive) {
      return {
        clear: false,
        clashes: [{ type: 'venue', detail: 'Selected venue is inactive or does not exist' }],
        suggestions: []
      };
    }

    const clashes = [];

    // Capacity check (not an overlap check)
    if (expectedTurnout > venue.capacity || seatLimit > venue.capacity) {
      clashes.push({
        type: 'capacity',
        detail: `Expected turnout (${expectedTurnout}) or seat limit (${seatLimit}) exceeds venue capacity (${venue.capacity})`
      });
    }

    // Overlap query condition: existing.start < new.end AND existing.end > new.start
    const candidateQuery = {
      status: { $in: ACTIVE_STATUSES },
      start: { $lt: endDate },
      end: { $gt: startDate }
    };
    if (eventId) {
      candidateQuery._id = { $ne: eventId };
    }

    const overlappingEvents = await Event.find(candidateQuery).populate('clubId', 'name');

    for (const ev of overlappingEvents) {
      // 1. Venue clash
      if (ev.venueId.toString() === venueId.toString()) {
        clashes.push({
          type: 'venue',
          eventId: ev._id,
          title: ev.title,
          clubName: ev.clubId?.name,
          start: ev.start,
          end: ev.end,
          detail: `Venue is already booked from ${ev.start.toISOString()} to ${ev.end.toISOString()}`
        });
      }

      // 2. Organiser clash
      if (ev.clubId && ev.clubId._id.toString() === clubId.toString()) {
        clashes.push({
          type: 'organiser',
          eventId: ev._id,
          title: ev.title,
          clubName: ev.clubId?.name,
          start: ev.start,
          end: ev.end,
          detail: `Club already has another slot-holding event during this time`
        });
      }

      // 3. Audience clash
      const audienceIntersection = (ev.audienceKeys || []).filter((k) => audienceKeys.includes(k));
      if (audienceIntersection.length > 0) {
        clashes.push({
          type: 'audience',
          eventId: ev._id,
          title: ev.title,
          clubName: ev.clubId?.name,
          start: ev.start,
          end: ev.end,
          detail: `Audience clash on: ${audienceIntersection.join(', ')}`
        });
      }
    }

    const clear = clashes.length === 0;
    const suggestions = clear ? [] : await this.generateSuggestions({ venueId, clubId, start: startDate, end: endDate, audienceKeys });

    return { clear, clashes, suggestions };
  },

  /**
   * Suggest 2-3 free slots (brain.md Section 8.1 Suggestion algorithm)
   */
  async generateSuggestions({ venueId, clubId, start, end, audienceKeys }) {
    // Stub implementation: returns top 3 nearest free slots (detailed in week 3 milestone)
    return [];
  }
};
