import { Club } from '../models/Club.js';
import { User } from '../models/User.js';
import { Approval } from '../models/Approval.js';
import {
  CLUB_STATUS,
  APPROVAL_STAGE,
  APPROVAL_STATUS,
  APPROVAL_DECISION,
  APPROVER_TYPE,
  AUDIT_ACTIONS
} from '../config/constants.js';
import { auditService } from './audit.service.js';
import { clockService } from './clock.service.js';
import { notifierService } from './notifier.service.js';
import { CLUB_TRANSITIONS, assertValidTransition } from './transitions/stateTransitions.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

export const clubService = {
  async submitClub({ name, description, department, facultyCoordinators, creatorId, meta = {} }) {
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
      after: club.toObject(),
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

  async getClubById(clubId, currentUser = null) {
    const club = await Club.findById(clubId).populate('organisers', 'name email department');
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    if (club.status !== CLUB_STATUS.ACTIVE) {
      const isOrganiser = currentUser && club.organisers.some((org) => org._id.toString() === currentUser._id.toString());
      const isAdmin = currentUser && currentUser.role === 'admin';
      if (!isOrganiser && !isAdmin) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
      }
    }

    return club;
  },

  async editClub(clubId, updates, userId, meta = {}) {
    const club = await Club.findById(clubId);
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    if (!club.organisers.some((org) => org.toString() === userId.toString())) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'Only organisers can edit the club.');
    }

    if (club.status !== CLUB_STATUS.REJECTED && club.status !== CLUB_STATUS.SUBMITTED) {
      throw new AppError(
        ERROR_CODES.INVALID_TRANSITION,
        409,
        'Club can only be edited while in rejected or submitted status.'
      );
    }

    const before = club.toObject();

    if (updates.name) club.name = updates.name;
    if (updates.description !== undefined) club.description = updates.description;
    if (updates.department !== undefined) club.department = updates.department;

    if (updates.facultyCoordinators) {
      const emails = updates.facultyCoordinators.map((c) => c.email.toLowerCase());
      if (emails.length > 1 && emails[0] === emails[1]) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'Faculty coordinator emails must be distinct.');
      }
      club.facultyCoordinators = updates.facultyCoordinators.map((c) => ({
        name: c.name,
        email: c.email.toLowerCase(),
        verifiedAt: null
      }));
    }

    await club.save();

    await auditService.log({
      actorType: 'user',
      actorId: userId,
      actorLabel: `User:${userId}`,
      action: 'CLUB_UPDATED',
      entityType: 'club',
      entityId: club._id,
      before,
      after: club.toObject(),
      meta
    });

    return club;
  },

  async resubmitClub(clubId, userId, meta = {}) {
    const club = await Club.findById(clubId);
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    if (!club.organisers.some((org) => org.toString() === userId.toString())) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'Only organisers can resubmit the club.');
    }

    assertValidTransition(club.status, CLUB_STATUS.SUBMITTED, CLUB_TRANSITIONS, 'Club');

    const before = club.toObject();
    club.status = CLUB_STATUS.SUBMITTED;
    club.submittedAt = clockService.now();
    club.resubmitCount = (club.resubmitCount || 0) + 1;
    await club.save();

    await auditService.log({
      actorType: 'user',
      actorId: userId,
      actorLabel: `User:${userId}`,
      action: AUDIT_ACTIONS.CLUB_RESUBMITTED,
      entityType: 'club',
      entityId: club._id,
      before,
      after: club.toObject(),
      meta
    });

    return club;
  },

  async addOrganiser(clubId, email, userId, meta = {}) {
    const club = await Club.findById(clubId);
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    if (!club.organisers.some((org) => org.toString() === userId.toString())) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'Only organisers can add new organisers.');
    }

    const student = await User.findOne({ email: email.toLowerCase() });
    if (!student) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Student user with this email not found.');
    }

    if (club.organisers.some((org) => org.toString() === student._id.toString())) {
      throw new AppError(ERROR_CODES.CONFLICT, 409, 'User is already an organiser of this club.');
    }

    club.organisers.push(student._id);
    await club.save();

    await auditService.log({
      actorType: 'user',
      actorId: userId,
      actorLabel: `User:${userId}`,
      action: 'CLUB_ORGANISER_ADDED',
      entityType: 'club',
      entityId: club._id,
      after: { addedUser: student._id },
      meta
    });

    return club;
  },

  // Admin Queue and Actions
  async listClubsForAdmin({ status, page = 1, limit = 20 }) {
    const filter = {};
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: [CLUB_STATUS.SUBMITTED, CLUB_STATUS.ADMIN_REVIEW] };
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;

    const [clubs, total] = await Promise.all([
      Club.find(filter)
        .populate('organisers', 'name email department')
        .sort({ submittedAt: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Club.countDocuments(filter)
    ]);

    return {
      clubs,
      meta: { page: parseInt(page, 10) || 1, limit: safeLimit, total }
    };
  },

  async openClubReview(clubId, adminId, meta = {}) {
    const club = await Club.findById(clubId);
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    assertValidTransition(club.status, CLUB_STATUS.ADMIN_REVIEW, CLUB_TRANSITIONS, 'Club');

    const before = club.toObject();
    club.status = CLUB_STATUS.ADMIN_REVIEW;
    await club.save();

    await auditService.log({
      actorType: 'user',
      actorId: adminId,
      actorLabel: `Admin:${adminId}`,
      action: AUDIT_ACTIONS.CLUB_OPENED,
      entityType: 'club',
      entityId: club._id,
      before,
      after: club.toObject(),
      meta
    });

    return club;
  },

  async approveClub(clubId, adminId, meta = {}) {
    const club = await Club.findById(clubId).populate('organisers', 'email name');
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    assertValidTransition(club.status, CLUB_STATUS.ACTIVE, CLUB_TRANSITIONS, 'Club');

    const now = clockService.now();
    const before = club.toObject();

    club.status = CLUB_STATUS.ACTIVE;
    club.decision = {
      by: adminId,
      at: now,
      reason: 'Approved by administrator'
    };

    // Verify all faculty coordinators
    club.facultyCoordinators.forEach((coord) => {
      coord.verifiedAt = now;
    });

    await club.save();

    // Create Approval record
    await Approval.create({
      subjectType: 'club',
      subjectId: club._id,
      stage: APPROVAL_STAGE.ADMIN_CLUB,
      round: club.resubmitCount + 1,
      approverType: APPROVER_TYPE.ADMIN_USER,
      approverUserId: adminId,
      status: APPROVAL_STATUS.APPROVED,
      decision: APPROVAL_DECISION.APPROVE,
      decidedAt: now,
      decidedVia: 'console',
      decidedIp: meta.ip,
      decidedUserAgent: meta.userAgent
    });

    await auditService.log({
      actorType: 'user',
      actorId: adminId,
      actorLabel: `Admin:${adminId}`,
      action: AUDIT_ACTIONS.CLUB_APPROVED,
      entityType: 'club',
      entityId: club._id,
      before,
      after: club.toObject(),
      meta
    });

    // Notify organisers
    for (const org of club.organisers) {
      await notifierService.sendEmail({
        to: org.email,
        subject: `Club Registration Approved: ${club.name}`,
        text: `Your club ${club.name} has been approved by the administration and is now active!`,
        templateName: 'club_approved',
        entityType: 'club',
        entityId: club._id
      });
    }

    return club;
  },

  async rejectClub(clubId, reason, adminId, meta = {}) {
    const club = await Club.findById(clubId).populate('organisers', 'email name');
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    assertValidTransition(club.status, CLUB_STATUS.REJECTED, CLUB_TRANSITIONS, 'Club');

    const now = clockService.now();
    const before = club.toObject();

    club.status = CLUB_STATUS.REJECTED;
    club.decision = {
      by: adminId,
      at: now,
      reason
    };

    await club.save();

    // Create Approval record
    await Approval.create({
      subjectType: 'club',
      subjectId: club._id,
      stage: APPROVAL_STAGE.ADMIN_CLUB,
      round: club.resubmitCount + 1,
      approverType: APPROVER_TYPE.ADMIN_USER,
      approverUserId: adminId,
      status: APPROVAL_STATUS.REJECTED,
      decision: APPROVAL_DECISION.REJECT,
      comment: reason,
      decidedAt: now,
      decidedVia: 'console',
      decidedIp: meta.ip,
      decidedUserAgent: meta.userAgent
    });

    await auditService.log({
      actorType: 'user',
      actorId: adminId,
      actorLabel: `Admin:${adminId}`,
      action: AUDIT_ACTIONS.CLUB_REJECTED,
      entityType: 'club',
      entityId: club._id,
      before,
      after: club.toObject(),
      meta: { ...meta, reason }
    });

    // Notify organisers with reason
    for (const org of club.organisers) {
      await notifierService.sendEmail({
        to: org.email,
        subject: `Club Registration Rejected: ${club.name}`,
        text: `Your club submission for ${club.name} was rejected. Reason: ${reason}`,
        templateName: 'club_rejected',
        entityType: 'club',
        entityId: club._id
      });
    }

    return club;
  },

  async suspendClub(clubId, reason, adminId, meta = {}) {
    const club = await Club.findById(clubId).populate('organisers', 'email name');
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    assertValidTransition(club.status, CLUB_STATUS.SUSPENDED, CLUB_TRANSITIONS, 'Club');

    const now = clockService.now();
    const before = club.toObject();

    club.status = CLUB_STATUS.SUSPENDED;
    club.suspendedAt = now;
    club.suspendReason = reason;

    await club.save();

    await auditService.log({
      actorType: 'user',
      actorId: adminId,
      actorLabel: `Admin:${adminId}`,
      action: AUDIT_ACTIONS.CLUB_SUSPENDED,
      entityType: 'club',
      entityId: club._id,
      before,
      after: club.toObject(),
      meta: { ...meta, reason }
    });

    // Notify organisers
    for (const org of club.organisers) {
      await notifierService.sendEmail({
        to: org.email,
        subject: `Club Suspended: ${club.name}`,
        text: `Your club ${club.name} has been suspended by the administration. Reason: ${reason}`,
        templateName: 'club_suspended',
        entityType: 'club',
        entityId: club._id
      });
    }

    return club;
  },

  async reinstateClub(clubId, adminId, meta = {}) {
    const club = await Club.findById(clubId).populate('organisers', 'email name');
    if (!club) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 404, 'Club not found');
    }

    assertValidTransition(club.status, CLUB_STATUS.ACTIVE, CLUB_TRANSITIONS, 'Club');

    const before = club.toObject();
    club.status = CLUB_STATUS.ACTIVE;
    club.suspendedAt = null;
    club.suspendReason = null;

    await club.save();

    await auditService.log({
      actorType: 'user',
      actorId: adminId,
      actorLabel: `Admin:${adminId}`,
      action: AUDIT_ACTIONS.CLUB_REINSTATED,
      entityType: 'club',
      entityId: club._id,
      before,
      after: club.toObject(),
      meta
    });

    // Notify organisers
    for (const org of club.organisers) {
      await notifierService.sendEmail({
        to: org.email,
        subject: `Club Reinstated: ${club.name}`,
        text: `Your club ${club.name} has been reinstated and is active again.`,
        templateName: 'club_reinstated',
        entityType: 'club',
        entityId: club._id
      });
    }

    return club;
  }
};
