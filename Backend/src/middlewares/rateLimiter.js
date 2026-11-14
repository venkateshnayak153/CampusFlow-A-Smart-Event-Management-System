import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

function createLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new AppError(ERROR_CODES.RATE_LIMITED, 429, message));
    }
  });
}

// Strict limiter for auth endpoints (15 mins, 20 attempts)
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  'Too many authentication requests, please try again later.'
);

// Strict limiter for coordinator link & OTP endpoints (15 mins, 30 attempts)
export const approvalLinkLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  'Too many approval requests, please try again later.'
);

// Scan limiter (1 min, 60 scans)
export const scanLimiter = createLimiter(
  60 * 1000,
  60,
  'Scan rate limit exceeded, please wait a moment.'
);
