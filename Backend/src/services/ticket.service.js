import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { TUNABLE } from '../config/constants.js';
import { clockService } from './clock.service.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

export const ticketService = {
  /**
   * Generates HMAC-signed payload for a confirmed registration (Section 8.5)
   * payload = "CF1." + ticketId + "." + registrationId + "." + eventId
   * signature = base64url( HMAC_SHA256( QR_HMAC_SECRET, payload ) )
   * qrText = payload + "." + signature
   */
  generateSignedQrText({ ticketId, registrationId, eventId }) {
    const payload = `CF1.${ticketId}.${registrationId}.${eventId}`;
    const hmac = crypto
      .createHmac('sha256', env.QR_HMAC_SECRET)
      .update(payload)
      .digest('base64url');
    return `${payload}.${hmac}`;
  },

  /**
   * Verify signature using constant-time comparison
   */
  verifySignedQrText(qrText) {
    const parts = qrText.split('.');
    if (parts.length !== 5 || parts[0] !== 'CF1') {
      return { valid: false, reason: 'MALFORMED' };
    }

    const [prefix, ticketId, registrationId, eventId, signature] = parts;
    const payload = `${prefix}.${ticketId}.${registrationId}.${eventId}`;
    const expectedSignature = crypto
      .createHmac('sha256', env.QR_HMAC_SECRET)
      .update(payload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, reason: 'INVALID_SIGNATURE' };
    }

    return {
      valid: true,
      ticketId,
      registrationId,
      eventId
    };
  },

  /**
   * Render QR code as Data URL
   */
  async renderQrDataUrl(qrText) {
    return QRCode.toDataURL(qrText, { errorCorrectionLevel: 'M' });
  }
};
