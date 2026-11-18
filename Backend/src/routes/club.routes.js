import { Router } from 'express';
import {
  submitClub,
  getMyClubs,
  getActiveClubs,
  getClubById,
  editClub,
  resubmitClub,
  addOrganiser
} from '../controllers/club.controller.js';
import { listClubEvents } from '../controllers/event.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import {
  validateSubmitClub,
  validateAddOrganiser
} from '../validations/club.validation.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(ROLES.STUDENT),
  validate(validateSubmitClub),
  submitClub
);

router.get('/mine', authenticate, getMyClubs);
router.get('/', getActiveClubs);
router.get('/:id', authenticate, getClubById);
router.get('/:id/events', authenticate, listClubEvents);
router.patch('/:id', authenticate, editClub);
router.post('/:id/resubmit', authenticate, resubmitClub);
router.post('/:id/organisers', authenticate, validate(validateAddOrganiser), addOrganiser);

export default router;
