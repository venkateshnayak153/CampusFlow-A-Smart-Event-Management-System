import mongoose from 'mongoose';
import { APPROVAL_STAGE, APPROVAL_STATUS, APPROVAL_DECISION, APPROVER_TYPE } from '../config/constants.js';

const approvalSchema = new mongoose.Schema(
  {
    subjectType: {
      type: String,
      enum: ['club', 'event'],
      required: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    stage: {
      type: String,
      enum: Object.values(APPROVAL_STAGE),
      required: true
    },
    round: {
      type: Number,
      required: true,
      default: 1
    },
    approverType: {
      type: String,
      enum: Object.values(APPROVER_TYPE),
      required: true
    },
    approverEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    approverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tokenHash: {
      type: String
    },
    tokenExpiresAt: Date,
    otpHash: String,
    otpExpiresAt: Date,
    otpAttempts: {
      type: Number,
      default: 0
    },
    otpSentAt: Date,
    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING
    },
    decision: {
      type: String,
      enum: Object.values(APPROVAL_DECISION)
    },
    comment: String,
    decidedAt: Date,
    decidedVia: {
      type: String,
      enum: ['email_link', 'console']
    },
    decidedIp: String,
    decidedUserAgent: String,
    escalatedAt: Date,
    reminderCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes specified in brain.md Section 6.6
approvalSchema.index({ tokenHash: 1 }, { unique: true, sparse: true });
approvalSchema.index({ subjectType: 1, subjectId: 1, round: 1 });
approvalSchema.index({ stage: 1, status: 1, createdAt: 1 });
approvalSchema.index({ approverEmail: 1, status: 1 });

export const Approval = mongoose.model('Approval', approvalSchema);
