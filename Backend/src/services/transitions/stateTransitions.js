import { CLUB_STATUS, EVENT_STATUS, APPROVAL_STATUS, REGISTRATION_STATUS } from '../../config/constants.js';
import { AppError } from '../../errors/AppError.js';
import { ERROR_CODES } from '../../errors/errorCodes.js';

/**
 * State Transition Tables
 * Brain.md Section 7:
 * "All transitions go through one transition table per entity.
 * Any move not in the table throws INVALID_TRANSITION (409).
 * The table is data, so tests can assert it exhaustively."
 */

export const CLUB_TRANSITIONS = {
  [CLUB_STATUS.SUBMITTED]: [CLUB_STATUS.ADMIN_REVIEW],
  [CLUB_STATUS.ADMIN_REVIEW]: [CLUB_STATUS.ACTIVE, CLUB_STATUS.REJECTED],
  [CLUB_STATUS.ACTIVE]: [CLUB_STATUS.SUSPENDED],
  [CLUB_STATUS.REJECTED]: [CLUB_STATUS.SUBMITTED], // organiser edits and resubmits
  [CLUB_STATUS.SUSPENDED]: [CLUB_STATUS.ACTIVE]
};

export const EVENT_TRANSITIONS = {
  [EVENT_STATUS.DRAFT]: [EVENT_STATUS.FACULTY_REVIEW, EVENT_STATUS.CANCELLED],
  [EVENT_STATUS.FACULTY_REVIEW]: [
    EVENT_STATUS.DRAFT, // changes requested
    EVENT_STATUS.ADMIN_REVIEW, // faculty approved, admin step needed
    EVENT_STATUS.PUBLISHED, // faculty approved, no admin needed
    EVENT_STATUS.REJECTED,
    EVENT_STATUS.CANCELLED
  ],
  [EVENT_STATUS.ADMIN_REVIEW]: [
    EVENT_STATUS.DRAFT, // admin requested changes
    EVENT_STATUS.PUBLISHED, // admin approved
    EVENT_STATUS.REJECTED,
    EVENT_STATUS.CANCELLED
  ],
  [EVENT_STATUS.PUBLISHED]: [
    EVENT_STATUS.COMPLETED,
    EVENT_STATUS.CANCELLED
  ],
  [EVENT_STATUS.REJECTED]: [],
  [EVENT_STATUS.COMPLETED]: [],
  [EVENT_STATUS.CANCELLED]: []
};

export const APPROVAL_TRANSITIONS = {
  [APPROVAL_STATUS.PENDING]: [
    APPROVAL_STATUS.APPROVED,
    APPROVAL_STATUS.CHANGES_REQUESTED,
    APPROVAL_STATUS.REJECTED,
    APPROVAL_STATUS.SUPERSEDED,
    APPROVAL_STATUS.EXPIRED
  ],
  [APPROVAL_STATUS.APPROVED]: [],
  [APPROVAL_STATUS.CHANGES_REQUESTED]: [],
  [APPROVAL_STATUS.REJECTED]: [],
  [APPROVAL_STATUS.SUPERSEDED]: [],
  [APPROVAL_STATUS.EXPIRED]: []
};

export const REGISTRATION_TRANSITIONS = {
  [REGISTRATION_STATUS.WAITLISTED]: [
    REGISTRATION_STATUS.CONFIRMED, // promoted
    REGISTRATION_STATUS.CANCELLED
  ],
  [REGISTRATION_STATUS.CONFIRMED]: [
    REGISTRATION_STATUS.CANCELLED
  ],
  [REGISTRATION_STATUS.CANCELLED]: []
};

/**
 * Validates a transition against a transition table
 * @param {string} fromState
 * @param {string} toState
 * @param {Record<string, string[]>} transitionTable
 * @param {string} entityName
 */
export function assertValidTransition(fromState, toState, transitionTable, entityName = 'Entity') {
  const allowed = transitionTable[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new AppError(
      ERROR_CODES.INVALID_TRANSITION,
      409,
      `Invalid state transition for ${entityName}: cannot move from '${fromState}' to '${toState}'. Allowed targets: [${allowed.join(', ')}]`,
      { from: fromState, to: toState, allowed }
    );
  }
}
