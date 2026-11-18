import { venueService } from '../services/venue.service.js';
import { sendSuccess } from '../utils/response.js';

export async function listActiveVenues(req, res, next) {
  try {
    const venues = await venueService.listActiveVenues();
    return sendSuccess(res, venues);
  } catch (err) {
    next(err);
  }
}

export async function getVenueAvailability(req, res, next) {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const availability = await venueService.getAvailability(req.params.id, dateStr);
    return sendSuccess(res, availability);
  } catch (err) {
    next(err);
  }
}

export async function createVenue(req, res, next) {
  try {
    const venue = await venueService.createVenue(req.body, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, venue, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateVenue(req, res, next) {
  try {
    const venue = await venueService.updateVenue(req.params.id, req.body, req.user._id, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendSuccess(res, venue);
  } catch (err) {
    next(err);
  }
}
