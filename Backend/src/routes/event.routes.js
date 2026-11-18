import { Router } from 'express';
import {
  createDraft,
  dryRunClash,
  listEvents,
  getEventById,
  updateDraft,
  deleteDraft,
  updateVolunteers
} from '../controllers/event.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { validateCreateEvent, validateDryRunClash } from '../validations/event.validation.js';

const router = Router();

// Public: list published events
router.get('/', listEvents);

// Event detail (published public; others require auth)
router.get('/:id', (req, res, next) => {
  // Optional authenticate: if Bearer header exists, authenticate user so ownership can be checked
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
}, getEventById);

// Organiser Event draft CRUD
router.post('/', authenticate, validate(validateCreateEvent), createDraft);
router.patch('/:id', authenticate, updateDraft);
router.delete('/:id', authenticate, deleteDraft);
router.put('/:id/volunteers', authenticate, updateVolunteers);

// Clash dry-run
router.post('/check', authenticate, validate(validateDryRunClash), dryRunClash);

export default router;
