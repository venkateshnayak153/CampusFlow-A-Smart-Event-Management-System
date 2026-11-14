import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const reqId = req.id || 'unknown';

  if (err instanceof AppError) {
    if (err.httpStatus >= 500) {
      logger.error({ reqId, err }, `[${reqId}] Internal operational error: ${err.message}`);
    } else {
      logger.warn({ reqId, code: err.code, status: err.httpStatus }, `[${reqId}] ${err.message}`);
    }

    return sendError(res, err.code, err.message, err.httpStatus, err.details);
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid ${err.path}: ${err.value}`,
      400
    );
  }

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    return sendError(
      res,
      ERROR_CODES.CONFLICT,
      `Duplicate value for field(s): ${fields.join(', ')}`,
      409,
      { duplicateFields: fields }
    );
  }

  // Log unknown/unexpected errors with requestId
  logger.error({ reqId, err }, `[${reqId}] Unhandled internal error: ${err.message}`);

  // Never leak unexpected error internals in response envelope
  return sendError(
    res,
    ERROR_CODES.INTERNAL,
    'An unexpected internal server error occurred.',
    500
  );
}
