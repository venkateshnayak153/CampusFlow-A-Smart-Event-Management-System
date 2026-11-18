import { isEmail, isNonEmptyString } from '../middlewares/validate.js';
import { TUNABLE } from '../config/constants.js';

export function validateRegister(req) {
  const errors = [];
  const { name, email, password, usn, department, year } = req.body || {};

  if (!isNonEmptyString(name) || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  }

  if (!isEmail(email)) {
    errors.push({ field: 'email', message: 'Valid email address is required' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }

  if (department && !TUNABLE.DEPARTMENTS.includes(department.toUpperCase())) {
    errors.push({ field: 'department', message: `Department must be one of: ${TUNABLE.DEPARTMENTS.join(', ')}` });
  }

  if (year !== undefined && year !== null) {
    const yr = Number(year);
    if (!TUNABLE.YEARS.includes(yr)) {
      errors.push({ field: 'year', message: `Year must be one of: ${TUNABLE.YEARS.join(', ')}` });
    }
  }

  return errors;
}

export function validateLogin(req) {
  const errors = [];
  const { email, password } = req.body || {};

  if (!isEmail(email)) {
    errors.push({ field: 'email', message: 'Valid email address is required' });
  }

  if (!isNonEmptyString(password)) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
}

export function validateChangePassword(req) {
  const errors = [];
  const { currentPassword, newPassword } = req.body || {};

  if (!isNonEmptyString(currentPassword)) {
    errors.push({ field: 'currentPassword', message: 'Current password is required' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    errors.push({ field: 'newPassword', message: 'New password must be at least 8 characters long' });
  }

  return errors;
}
