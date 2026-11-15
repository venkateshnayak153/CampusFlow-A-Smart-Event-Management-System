import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import clubRoutes from './club.routes.js';
import venueRoutes from './venue.routes.js';
import eventRoutes from './event.routes.js';

const apiRouter = Router();

// Liveness & health
apiRouter.use(healthRoutes);

// Feature modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/clubs', clubRoutes);
apiRouter.use('/venues', venueRoutes);
apiRouter.use('/events', eventRoutes);

export default apiRouter;
