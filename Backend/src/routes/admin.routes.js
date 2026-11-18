import { Router } from 'express';
import {
  listAdminClubs,
  openClubReview,
  approveClub,
  rejectClub,
  suspendClub,
  reinstateClub
} from '../controllers/club.controller.js';
import { getAuditLogs } from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { validateReason } from '../validations/club.validation.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Protect all admin routes with authentication and ADMIN role check
router.use(authenticate, authorize(ROLES.ADMIN));

// Club Management Queue and Decisions
router.get('/clubs', listAdminClubs);
router.post('/clubs/:id/open', openClubReview);
router.post('/clubs/:id/approve', approveClub);
router.post('/clubs/:id/reject', validate(validateReason), rejectClub);
router.post('/clubs/:id/suspend', validate(validateReason), suspendClub);
router.post('/clubs/:id/reinstate', reinstateClub);

// Audit Trail
router.get('/audit', getAuditLogs);

export default router;
