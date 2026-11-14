import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

/**
 * Role-based Authorization Middleware
 * Checks coarse-grained roles on route level.
 * @param  {...string} allowedRoles
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          ERROR_CODES.UNAUTHENTICATED,
          401,
          'Authentication required before role check'
        )
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          ERROR_CODES.FORBIDDEN,
          403,
          `Forbidden: role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}
