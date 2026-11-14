import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';

let server;

export async function startServer() {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Start HTTP server
    server = app.listen(env.PORT, () => {
      logger.info(`CampusFlow Backend listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // 3. Graceful shutdown listeners
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed');
          await disconnectDB();
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}
