import { Router } from 'express';
import { createDraft, dryRunClash } from '../controllers/event.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createEventSchema, dryRunClashSchema } from '../validations/event.validation.js';

const router = Router();

router.post('/', authenticate, validate({ body: createEventSchema }), createDraft);
router.post('/check', authenticate, validate({ body: dryRunClashSchema }), dryRunClash);

export default router;
