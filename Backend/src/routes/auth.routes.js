import { Router } from 'express';
import { register, login, getMe, changePassword } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validateRegister, validateLogin, validateChangePassword } from '../validations/auth.validation.js';

const router = Router();

router.post('/register', authLimiter, validate(validateRegister), register);
router.post('/login', authLimiter, validate(validateLogin), login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, validate(validateChangePassword), changePassword);

export default router;
