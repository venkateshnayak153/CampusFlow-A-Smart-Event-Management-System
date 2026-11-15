import { Club } from '../models/Club.js';
import { CLUB_STATUS, AUDIT_ACTIONS } from '../config/constants.js';
import { auditService } from './audit.service.js';
import { clockService } from './clock.service.js';
import { CLUB_TRANSITIONS, assertValidTransition } from './transitions/stateTransitions.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

export const clubService = {
  async submitClub({ name, description, department, facultyCoordinators, creatorId, meta = {} }) {
    // Validate faculty coordinator emails
    const emails = facultyCoordinators.map((c) => c.email.toLowerCase());
    if (emails.length > 1 && emails[0] === emails[1]) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'Faculty coordinator emails must be distinct.');
    }

    const club = await Club.create({
      name,
      description,
      department,
      organisers: [creatorId],
      facultyCoordinators: facultyCoordinators.map((c) => ({
        name: c.name,
        email: c.email.toLowerCase(),
        verifiedAt: null
      })),
      status: CLUB_STATUS.SUBMITTED,
      submittedAt: clockService.now()
    });

    await auditService.log({
      actorType: 'user',
      actorId: creatorId,
      actorLabel: `User:${creatorId}`,
      action: AUDIT_ACTIONS.CLUB_SUBMITTED,
      entityType: 'club',
      entityId: club._id,
      meta
    });

    return club;
  },

  async getMyClubs(userId) {
    return Club.find({ organisers: userId }).sort({ updatedAt: -1 });
  },

  async getActiveClubs() {
    return Club.find({ status: CLUB_STATUS.ACTIVE }).sort({ name: 1 });
  },

  async getClubById(clubId) {
    const club = await Club.findById(clubId).populate('organisers', 'name email department');
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }
    return club;
  }
};
