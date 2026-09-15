import { z } from 'zod';

export const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(200),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).max(72).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  emergencyPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number').optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const updateMemberSchema = createMemberSchema.partial();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
