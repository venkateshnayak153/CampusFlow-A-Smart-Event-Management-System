import { z } from 'zod';

export const submitClubSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  department: z.string().max(50).optional(),
  facultyCoordinators: z
    .array(
      z.object({
        name: z.string().min(2).max(100),
        email: z.string().email()
      })
    )
    .min(1, 'At least 1 faculty coordinator is required')
    .max(2, 'Maximum 2 faculty coordinators allowed')
});

export const addOrganiserSchema = z.object({
  email: z.string().email()
});

export const reasonSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters')
});
