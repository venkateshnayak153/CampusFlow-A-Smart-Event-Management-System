import { Router } from 'express';
import healthRoutes from './health.routes.js';

const apiRouter = Router();

// Mount health routes (accessible at /health and /api/v1/health)
apiRouter.use(healthRoutes);

// Logical module routes will be registered here:
// apiRouter.use('/auth', authRoutes);
// apiRouter.use('/users', userRoutes);
// apiRouter.use('/clubs', clubRoutes);
// apiRouter.use('/venues', venueRoutes);
// apiRouter.use('/events', eventRoutes);
// apiRouter.use('/approvals', approvalRoutes);
// apiRouter.use('/registrations', registrationRoutes);
// apiRouter.use('/checkin', checkinRoutes);
// apiRouter.use('/admin', adminRoutes);

export default apiRouter;
