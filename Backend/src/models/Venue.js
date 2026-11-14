import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    building: {
      type: String,
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    },
    facilities: [
      {
        type: String,
        trim: true
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Venue = mongoose.model('Venue', venueSchema);
