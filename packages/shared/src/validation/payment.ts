import { z } from 'zod';

export const collectFeeSchema = z.object({
  memberId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'netbanking', 'razorpay']),
  upiRef: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  durationDays: z.number().int().positive(),
  price: z.number().positive(),
  gstPercent: z.number().min(0).max(100).default(18),
  description: z.string().max(500).optional(),
});

export const createSubscriptionSchema = z.object({
  memberId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string(),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'netbanking', 'razorpay']),
  upiRef: z.string().optional(),
});

export const createRazorpayOrderSchema = z.object({
  memberId: z.string().uuid().optional(),
});

const optionalQueryText = (max: number) => z.preprocess(
  (value) => value === '' || value === undefined ? undefined : value,
  z.string().trim().max(max).optional(),
);

const optionalDate = z.preprocess(
  (value) => value === '' || value === undefined ? undefined : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional(),
);

export const paymentHistoryQuerySchema = z.object({
  memberId: z.preprocess(
    (value) => value === '' || value === undefined ? undefined : value,
    z.string().uuid().optional(),
  ),
  search: optionalQueryText(200),
  from: optionalDate,
  to: optionalDate,
  method: z.preprocess(
    (value) => value === '' || value === undefined ? undefined : value,
    z.enum(['cash', 'upi', 'card', 'netbanking', 'razorpay']).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).refine(
  (query) => !query.from || !query.to || query.from <= query.to,
  { message: 'From date must be before or equal to the to date', path: ['from'] },
);

export const verifyRazorpayPaymentSchema = z.object({
  razorpayOrderId: z.string().min(10),
  razorpayPaymentId: z.string().min(10),
  razorpaySignature: z.string().min(10),
});

export type CollectFeeInput = z.infer<typeof collectFeeSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;
export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;
export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;
