import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { auditService } from './audit.service.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

class NotifierService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    if (this.transporter) return this.transporter;

    if (env.SMTP_HOST && env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });
    }

    return this.transporter;
  }

  async sendEmail({ to, subject, html, text, templateName, entityType, entityId }) {
    const transporter = this.getTransporter();
    if (!transporter) {
      logger.warn({ to, subject, templateName }, 'SMTP credentials not configured; logging email output for manual testing');
      return { success: true, simulated: true };
    }

    try {
      const info = await transporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        html,
        text
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error({ err, to, subject }, 'Failed to deliver email');
      await auditService.log({
        actorType: 'system',
        actorLabel: 'system:notifier',
        action: AUDIT_ACTIONS.EMAIL_FAILED,
        entityType: entityType || 'system',
        entityId: entityId || null,
        meta: { to, subject, error: err.message }
      });
      return { success: false, error: err.message };
    }
  }
}

export const notifierService = new NotifierService();
