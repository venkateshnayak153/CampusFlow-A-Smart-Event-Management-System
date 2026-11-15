import { clubService } from '../services/club.service.js';
import { sendSuccess } from '../utils/response.js';

export async function submitClub(req, res, next) {
  try {
    const club = await clubService.submitClub({
      ...req.body,
      creatorId: req.user._id,
      meta: {
        requestId: req.id,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    return sendSuccess(res, club, 201);
  } catch (err) {
    next(err);
  }
}

export async function getMyClubs(req, res, next) {
  try {
    const clubs = await clubService.getMyClubs(req.user._id);
    return sendSuccess(res, clubs);
  } catch (err) {
    next(err);
  }
}

export async function getActiveClubs(req, res, next) {
  try {
    const clubs = await clubService.getActiveClubs();
    return sendSuccess(res, clubs);
  } catch (err) {
    next(err);
  }
}

export async function getClubById(req, res, next) {
  try {
    const club = await clubService.getClubById(req.params.id);
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}
