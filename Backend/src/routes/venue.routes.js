import { Router } from 'express';
import { listActiveVenues, getVenueAvailability, createVenue, updateVenue } from '../controllers/venue.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.get('/', listActiveVenues);
router.get('/:id/availability', getVenueAvailability);
router.post('/', authenticate, authorize(ROLES.ADMIN), createVenue);
router.patch('/:id', authenticate, authorize(ROLES.ADMIN), updateVenue);

export default router;
