import mongoose from 'mongoose';
import { clockService } from '../services/clock.service.js';
import { sendSuccess } from '../utils/response.js';

export async function getHealth(req, res) {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isHealthy = dbState === 1;

  return sendSuccess(
    res,
    {
      status: isHealthy ? 'healthy' : 'degraded',
      database: dbStatusMap[dbState] || 'unknown',
      time: clockService.now().toISOString(),
      uptime: process.uptime()
    },
    isHealthy ? 200 : 503
  );
}
