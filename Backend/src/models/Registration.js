import mongoose from 'mongoose';
import { REGISTRATION_STATUS, REGISTRATION_CANCEL_REASON } from '../config/constants.js';

const ticketSubSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String
    },
    issuedAt: {
      type: Date
    }
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(REGISTRATION_STATUS),
      required: true
    },
    waitlistedAt: Date,
    promotedAt: Date,
    cancelledAt: Date,
    cancelReason: {
      type: String,
      enum: Object.values(REGISTRATION_CANCEL_REASON)
    },
    ticket: ticketSubSchema,
    ticketNotifiedAt: Date,
    checkedInAt: {
      type: Date,
      default: null
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes specified in brain.md Section 6.5
// Unique partial: a student cannot hold two active registrations for the same event
registrationSchema.index(
  { eventId: 1, studentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [REGISTRATION_STATUS.CONFIRMED, REGISTRATION_STATUS.WAITLISTED] }
    }
  }
);

registrationSchema.index({ eventId: 1, status: 1, waitlistedAt: 1 });
registrationSchema.index({ studentId: 1, status: 1 });
registrationSchema.index({ 'ticket.ticketId': 1 }, { unique: true, sparse: true });

export const Registration = mongoose.model('Registration', registrationSchema);
