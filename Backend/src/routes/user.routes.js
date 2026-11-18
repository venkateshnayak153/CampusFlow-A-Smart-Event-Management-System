import { Router } from 'express';
import { listUsers, createUser, updateUser } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Admin-only user management
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);

export default router;
