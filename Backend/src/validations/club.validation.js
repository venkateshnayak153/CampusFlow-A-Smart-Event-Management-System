import { isEmail, isNonEmptyString } from '../middlewares/validate.js';

export function validateSubmitClub(req) {
  const errors = [];
  const { name, facultyCoordinators } = req.body || {};

  if (!isNonEmptyString(name) || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Club name must be at least 2 characters long' });
  }

  if (!Array.isArray(facultyCoordinators) || facultyCoordinators.length < 1 || facultyCoordinators.length > 2) {
    errors.push({ field: 'facultyCoordinators', message: 'Club must have 1 or 2 faculty coordinators' });
  } else {
    facultyCoordinators.forEach((coord, idx) => {
      if (!coord || !isNonEmptyString(coord.name)) {
        errors.push({ field: `facultyCoordinators[${idx}].name`, message: 'Coordinator name is required' });
      }
      if (!coord || !isEmail(coord.email)) {
        errors.push({ field: `facultyCoordinators[${idx}].email`, message: 'Valid coordinator email is required' });
      }
    });
  }

  return errors;
}

export function validateAddOrganiser(req) {
  const errors = [];
  const { email } = req.body || {};

  if (!isEmail(email)) {
    errors.push({ field: 'email', message: 'Valid organiser email is required' });
  }

  return errors;
}

export function validateReason(req) {
  const errors = [];
  const { reason } = req.body || {};

  if (!isNonEmptyString(reason) || reason.trim().length < 5) {
    errors.push({ field: 'reason', message: 'Reason must be at least 5 characters long' });
  }

  return errors;
}
