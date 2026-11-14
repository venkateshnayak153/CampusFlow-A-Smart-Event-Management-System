import mongoose from 'mongoose';
import { EVENT_STATUS, EVENT_TYPES, TUNABLE } from '../config/constants.js';

const audienceItemSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    year: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: EVENT_TYPES,
      required: true
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true
    },
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    audience: [audienceItemSchema],
    audienceKeys: [
      {
        type: String,
        index: true
      }
    ],
    expectedTurnout: {
      type: Number,
      default: 0
    },
    seatLimit: {
      type: Number,
      required: true,
      min: 1
    },
    seatsLeft: {
      type: Number
    },
    budget: {
      type: Number,
      default: 0
    },
    externalGuests: {
      type: Boolean,
      default: false
    },
    guestDetails: {
      type: String,
      trim: true
    },
    registrationOpensAt: Date,
    registrationClosesAt: Date,
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT
    },
    requiresAdminApproval: {
      type: Boolean,
      default: false
    },
    holdsSlotSince: {
      type: Date,
      default: null
    },
    approvalRound: {
      type: Number,
      default: 1
    },
    lastFeedback: {
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      comment: String,
      at: Date
    },
    volunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    publishedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String
  },
  {
    timestamps: true
  }
);

// Pre-save hook to automatically derive audienceKeys from audience
eventSchema.pre('save', function (next) {
  if (this.audience && Array.isArray(this.audience)) {
    this.audienceKeys = this.audience.map((a) => `${a.department}-${a.year}`);
  }
  next();
});

// Indexes specified in brain.md Section 6.4
eventSchema.index({ venueId: 1, start: 1, end: 1 });
eventSchema.index({ clubId: 1, start: 1 });
eventSchema.index({ audienceKeys: 1, start: 1 });
eventSchema.index({ status: 1, start: 1 });
eventSchema.index({ status: 1, holdsSlotSince: 1 });

export const Event = mongoose.model('Event', eventSchema);
