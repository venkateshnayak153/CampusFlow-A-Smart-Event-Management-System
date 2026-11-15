import { Router } from 'express';
import { submitClub, getMyClubs, getActiveClubs, getClubById } from '../controllers/club.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { submitClubSchema } from '../validations/club.validation.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(ROLES.STUDENT),
  validate({ body: submitClubSchema }),
  submitClub
);

router.get('/mine', authenticate, getMyClubs);
router.get('/', getActiveClubs);
router.get('/:id', authenticate, getClubById);

export default router;
