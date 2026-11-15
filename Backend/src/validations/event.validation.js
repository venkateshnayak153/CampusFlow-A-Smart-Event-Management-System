import { z } from 'zod';
import { EVENT_TYPES, TUNABLE } from '../config/constants.js';

export const createEventSchema = z.object({
  clubId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid club ObjectId'),
  title: z.string().min(3).max(150),
  description: z.string().max(5000).optional(),
  type: z.enum(EVENT_TYPES),
  venueId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid venue ObjectId'),
  start: z.string().datetime(),
  end: z.string().datetime(),
  audience: z
    .array(
      z.object({
        department: z.enum(TUNABLE.DEPARTMENTS),
        year: z.number().int().min(1).max(4)
      })
    )
    .min(1),
  expectedTurnout: z.number().int().min(1),
  seatLimit: z.number().int().min(1),
  budget: z.number().min(0).default(0),
  externalGuests: z.boolean().default(false),
  guestDetails: z.string().max(1000).optional()
});

export const dryRunClashSchema = z.object({
  eventId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  venueId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  start: z.string().datetime(),
  end: z.string().datetime(),
  audience: z
    .array(
      z.object({
        department: z.enum(TUNABLE.DEPARTMENTS),
        year: z.number().int().min(1).max(4)
      })
    )
    .optional(),
  expectedTurnout: z.number().int().min(1),
  seatLimit: z.number().int().min(1)
});
