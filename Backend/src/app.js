import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { AppError } from './errors/AppError.js';
import { ERROR_CODES } from './errors/errorCodes.js';
import apiRouter from './routes/index.js';
import healthRoutes from './routes/health.routes.js';

const app = express();

// Security and utility middleware chain
app.use(requestIdMiddleware);
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

// Root health check
app.use(healthRoutes);

// Base API route
app.use('/api/v1', apiRouter);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  next(
    new AppError(
      ERROR_CODES.NOT_FOUND,
      404,
      `Route not found: ${req.method} ${req.originalUrl}`
    )
  );
});

// Central error handler
app.use(errorHandler);

export { app };
