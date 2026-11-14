import mongoose from 'mongoose';
import { AUDIT_ACTIONS } from '../config/constants.js';

const auditLogSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ['user', 'system', 'coordinator_link'],
      required: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    actorLabel: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true
    },
    entityType: {
      type: String,
      enum: ['user', 'club', 'event', 'venue', 'registration', 'approval', 'checkin'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    meta: {
      requestId: String,
      ip: String,
      userAgent: String,
      reason: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Invariant: Audit log is append-only. Reject updates and deletes at Mongoose level.
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('AuditLog is append-only and cannot be modified or deleted.');
});

// Indexes specified in brain.md Section 6.8
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
