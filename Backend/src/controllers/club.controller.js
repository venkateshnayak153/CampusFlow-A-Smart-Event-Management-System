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
    const club = await clubService.getClubById(req.params.id, req.user);
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}

export async function editClub(req, res, next) {
  try {
    const club = await clubService.editClub(req.params.id, req.body, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}

export async function resubmitClub(req, res, next) {
  try {
    const club = await clubService.resubmitClub(req.params.id, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}

export async function addOrganiser(req, res, next) {
  try {
    const club = await clubService.addOrganiser(req.params.id, req.body.email, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}

// Admin Controller Handlers
export async function listAdminClubs(req, res, next) {
  try {
    const result = await clubService.listClubsForAdmin(req.query);
    return sendSuccess(res, result.clubs, 200, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function openClubReview(req, res, next) {
  try {
    const club = await clubService.openClubReview(req.params.id, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}

export async function approveClub(req, res, next) {
  try {
    const club = await clubService.approveClub(req.params.id, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}

export async function rejectClub(req, res, next) {
  try {
    const club = await clubService.rejectClub(req.params.id, req.body.reason, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}

export async function suspendClub(req, res, next) {
  try {
    const club = await clubService.suspendClub(req.params.id, req.body.reason, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}

export async function reinstateClub(req, res, next) {
  try {
    const club = await clubService.reinstateClub(req.params.id, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, club);
  } catch (err) {
    next(err);
  }
}
