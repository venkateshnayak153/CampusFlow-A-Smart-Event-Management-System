import { isObjectId, isIsoDate, isNonEmptyString } from '../middlewares/validate.js';
import { EVENT_TYPES, TUNABLE } from '../config/constants.js';

export function validateCreateEvent(req) {
  const errors = [];
  const { clubId, title, type, venueId, start, end, audience, expectedTurnout, seatLimit } = req.body || {};

  if (!isObjectId(clubId)) {
    errors.push({ field: 'clubId', message: 'Valid club ObjectId is required' });
  }

  if (!isNonEmptyString(title) || title.trim().length < 3) {
    errors.push({ field: 'title', message: 'Title must be at least 3 characters long' });
  }

  if (!EVENT_TYPES.includes(type)) {
    errors.push({ field: 'type', message: `Type must be one of: ${EVENT_TYPES.join(', ')}` });
  }

  if (!isObjectId(venueId)) {
    errors.push({ field: 'venueId', message: 'Valid venue ObjectId is required' });
  }

  if (!isIsoDate(start)) {
    errors.push({ field: 'start', message: 'Valid ISO datetime start is required' });
  }

  if (!isIsoDate(end)) {
    errors.push({ field: 'end', message: 'Valid ISO datetime end is required' });
  }

  if (isIsoDate(start) && isIsoDate(end) && new Date(end) <= new Date(start)) {
    errors.push({ field: 'end', message: 'End time must be after start time' });
  }

  if (!Array.isArray(audience) || audience.length === 0) {
    errors.push({ field: 'audience', message: 'Audience array cannot be empty' });
  } else {
    audience.forEach((item, idx) => {
      if (!item || !TUNABLE.DEPARTMENTS.includes((item.department || '').toUpperCase())) {
        errors.push({ field: `audience[${idx}].department`, message: `Department must be one of: ${TUNABLE.DEPARTMENTS.join(', ')}` });
      }
      if (!item || !TUNABLE.YEARS.includes(Number(item.year))) {
        errors.push({ field: `audience[${idx}].year`, message: `Year must be one of: ${TUNABLE.YEARS.join(', ')}` });
      }
    });
  }

  if (typeof expectedTurnout !== 'number' || expectedTurnout < 1) {
    errors.push({ field: 'expectedTurnout', message: 'Expected turnout must be a positive number' });
  }

  if (typeof seatLimit !== 'number' || seatLimit < 1) {
    errors.push({ field: 'seatLimit', message: 'Seat limit must be a positive number' });
  }

  return errors;
}

export function validateDryRunClash(req) {
  const errors = [];
  const { clubId, venueId, start, end, expectedTurnout, seatLimit } = req.body || {};

  if (!isObjectId(clubId)) {
    errors.push({ field: 'clubId', message: 'Valid club ObjectId is required' });
  }

  if (!isObjectId(venueId)) {
    errors.push({ field: 'venueId', message: 'Valid venue ObjectId is required' });
  }

  if (!isIsoDate(start)) {
    errors.push({ field: 'start', message: 'Valid ISO datetime start is required' });
  }

  if (!isIsoDate(end)) {
    errors.push({ field: 'end', message: 'Valid ISO datetime end is required' });
  }

  if (typeof expectedTurnout !== 'number' || expectedTurnout < 1) {
    errors.push({ field: 'expectedTurnout', message: 'Expected turnout must be a positive number' });
  }

  if (typeof seatLimit !== 'number' || seatLimit < 1) {
    errors.push({ field: 'seatLimit', message: 'Seat limit must be a positive number' });
  }

  return errors;
}
