import { ERROR_CODES, ERROR_STATUS_MAP } from './errorCodes.js';

export class AppError extends Error {
  /**
   * @param {string} code - One of ERROR_CODES
   * @param {number} [httpStatus] - HTTP status code (defaults to mapped status for the code)
   * @param {string} message - Human-readable explanation
   * @param {any} [details] - Additional contextual data (validation failures, clashes, suggestions, etc.)
   */
  constructor(code, httpStatus, message, details = undefined) {
    super(message || code);
    this.name = 'AppError';
    this.code = code || ERROR_CODES.INTERNAL;
    this.httpStatus = httpStatus || ERROR_STATUS_MAP[this.code] || 500;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
