import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

/**
 * Validation middleware without external libraries.
 * Accepts a validator function that takes `req` and returns an array of error objects:
 * `[{ field: string, message: string }]`
 *
 * @param {(req: import('express').Request) => Array<{ field: string, message: string }>} validatorFn
 */
export function validate(validatorFn) {
  return (req, res, next) => {
    try {
      const errors = validatorFn(req);
      if (errors && errors.length > 0) {
        return next(
          new AppError(
            ERROR_CODES.VALIDATION_ERROR,
            400,
            'Request validation failed',
            errors
          )
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validation utility helpers
 */
export const isEmail = (val) => typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
export const isObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
export const isIsoDate = (val) => typeof val === 'string' && !isNaN(Date.parse(val));
export const isNonEmptyString = (val) => typeof val === 'string' && val.trim().length > 0;
