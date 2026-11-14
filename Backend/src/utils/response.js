/**
 * Standard API Response Envelope Helpers
 * Matches specification in brain.md (Section 3.3, 9.1)
 */

export function sendSuccess(res, data = null, statusCode = 200, meta = undefined) {
  const response = {
    ok: true,
    data
  };
  if (meta !== undefined) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
}

export function sendError(res, code, message, statusCode = 400, details = undefined) {
  const response = {
    ok: false,
    error: {
      code,
      message
    }
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return res.status(statusCode).json(response);
}
