import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';

export async function listUsers(req, res, next) {
  try {
    const result = await userService.listUsers(req.query);
    return sendSuccess(res, result.users, 200, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await userService.createUserByAdmin(req.body, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, user, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUserByAdmin(req.params.id, req.body, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
