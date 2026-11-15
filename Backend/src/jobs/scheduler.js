import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const scheduledJobs = {
  async runApprovalEscalation() {
    logger.info('[CRON] Running approvalEscalation job');
  },

  async runTicketReleaseNotifier() {
    logger.info('[CRON] Running ticketReleaseNotifier job');
  },

  async runEventCompletion() {
    logger.info('[CRON] Running eventCompletion job');
  }
};

export function initScheduler() {
  if (!env.ENABLE_CRON) {
    logger.info('Scheduler disabled by configuration (ENABLE_CRON=false)');
    return;
  }

  // 1. Approval escalation - hourly
  cron.schedule('0 * * * *', () => {
    scheduledJobs.runApprovalEscalation().catch((err) => {
      logger.error({ err }, '[CRON] approvalEscalation failed');
    });
  });

  // 2. Ticket release notifier - every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    scheduledJobs.runTicketReleaseNotifier().catch((err) => {
      logger.error({ err }, '[CRON] ticketReleaseNotifier failed');
    });
  });

  // 3. Event completion - every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    scheduledJobs.runEventCompletion().catch((err) => {
      logger.error({ err }, '[CRON] eventCompletion failed');
    });
  });

  logger.info('Node-cron jobs successfully scheduled');
}
