import mongoose from 'mongoose';
import { CLUB_STATUS } from '../config/constants.js';

const facultyCoordinatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      collation: { locale: 'en', strength: 2 }
    },
    description: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true,
      uppercase: true
    },
    organisers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    facultyCoordinators: {
      type: [facultyCoordinatorSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 1 && v.length <= 2,
        message: 'A club must have 1 or 2 faculty coordinators.'
      }
    },
    status: {
      type: String,
      enum: Object.values(CLUB_STATUS),
      default: CLUB_STATUS.SUBMITTED
    },
    decision: {
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      at: Date,
      reason: String
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    resubmitCount: {
      type: Number,
      default: 0
    },
    suspendedAt: Date,
    suspendReason: String
  },
  {
    timestamps: true
  }
);

// Indexes specified in brain.md Section 6.2
clubSchema.index({ status: 1, submittedAt: 1 });
clubSchema.index({ organisers: 1 });
clubSchema.index({ 'facultyCoordinators.email': 1 });

export const Club = mongoose.model('Club', clubSchema);
