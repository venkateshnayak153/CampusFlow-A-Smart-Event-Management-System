import mongoose from 'mongoose';
import { ROLES, TUNABLE } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STUDENT,
      index: true
    },
    usn: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true
    },
    department: {
      type: String,
      trim: true,
      uppercase: true,
      enum: TUNABLE.DEPARTMENTS
    },
    year: {
      type: Number,
      enum: TUNABLE.YEARS
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model('User', userSchema);
