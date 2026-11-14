import mongoose from 'mongoose';
import { CHECKIN_RESULT } from '../config/constants.js';

const checkInSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      default: null
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    scannedAt: {
      type: Date,
      default: Date.now
    },
    result: {
      type: String,
      enum: Object.values(CHECKIN_RESULT),
      required: true
    },
    payloadFingerprint: {
      type: String,
      required: true
    }
  },
  {
    timestamps: false
  }
);

// Indexes specified in brain.md Section 6.7
checkInSchema.index({ eventId: 1, scannedAt: -1 });
checkInSchema.index({ registrationId: 1 });
checkInSchema.index({ eventId: 1, result: 1 });

export const CheckIn = mongoose.model('CheckIn', checkInSchema);
