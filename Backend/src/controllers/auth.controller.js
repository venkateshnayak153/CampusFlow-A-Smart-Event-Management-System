import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

export async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    return sendSuccess(res, user, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { token, user } = await authService.login({
      email: req.body.email,
      password: req.body.password,
      meta: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id
      }
    });
    return sendSuccess(res, { token, user });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    return sendSuccess(res, {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      year: req.user.year,
      usn: req.user.usn
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword({
      userId: req.user._id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
      meta: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id
      }
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
