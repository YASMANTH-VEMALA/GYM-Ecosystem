import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import { validate } from '../middleware/validate';
import {
  collectFeeSchema,
  createPlanSchema,
  createRazorpayOrderSchema,
  createSubscriptionSchema,
  paymentHistoryQuerySchema,
  verifyRazorpayPaymentSchema,
} from '@gymstack/shared';
import * as paymentService from '../services/payment.service';
import * as razorpayService from '../services/razorpay.service';
import prisma from '@gymstack/db';

const router = Router();
router.use(authenticate, gymContext);

function parseHistoryQuery(req: Request, res: Response) {
  const parsed = paymentHistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid payment history filters',
      details: parsed.error.errors.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return null;
  }
  return parsed.data;
}

function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function requirePaymentHistoryAccess(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'manager' && req.query.memberId && req.user.portalSections.includes('members')) {
    next();
    return;
  }
  requireManagerSection('payments', 'fees')(req, res, next);
}

// Plans
router.get('/plans', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('payments', 'fees'), async (req: Request, res: Response) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where: { gymId: req.gymId!, isActive: true },
      orderBy: { durationDays: 'asc' },
    });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/plans', requireRole('gym_owner'), validate(createPlanSchema), async (req: Request, res: Response) => {
  try {
    const plan = await prisma.membershipPlan.create({
      data: { ...req.body, gymId: req.gymId! },
    });
    res.status(201).json({ plan });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Subscriptions
router.post('/subscriptions', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('payments', 'fees'), validate(createSubscriptionSchema), async (req: Request, res: Response) => {
  try {
    const result = await paymentService.createSubscription(req.gymId!, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Payments
router.get('/export', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('payments', 'fees'), async (req: Request, res: Response) => {
  try {
    const query = parseHistoryQuery(req, res);
    if (!query) return;
    const { page: _page, limit: _limit, ...filters } = query;
    const payments = await paymentService.getPaymentExportRows(req.gymId!, filters);
    const rows = payments.map((payment) => [
      payment.paidAt.toISOString(),
      payment.member.memberCode,
      payment.member.user.name,
      payment.member.user.phone,
      payment.subscription?.plan.name ?? '',
      Number(payment.totalAmount).toFixed(2),
      payment.paymentMethod,
      payment.paymentStatus,
      payment.invoiceNumber,
    ]);
    const csv = [
      ['Paid at', 'Member code', 'Member', 'Phone', 'Plan', 'Amount', 'Method', 'Status', 'Invoice'],
      ...rows,
    ].map((row) => row.map(csvCell).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(`\uFEFF${csv}`);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/', requireRole('gym_owner', 'manager', 'receptionist'), requirePaymentHistoryAccess, async (req: Request, res: Response) => {
  try {
    const query = parseHistoryQuery(req, res);
    if (!query) return;
    const result = await paymentService.getPayments(req.gymId!, query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/collect', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('payments', 'fees'), validate(collectFeeSchema), async (req: Request, res: Response) => {
  try {
    const result = await paymentService.collectPayment(req.gymId!, req.body);
    res.status(201).json({ payment: result.payment, invoiceNumber: result.invoiceNumber });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get('/due', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('payments', 'fees'), async (req: Request, res: Response) => {
  try {
    const members = await paymentService.getDueMembers(req.gymId!);
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/razorpay/order', requireRole('member', 'gym_owner', 'manager', 'receptionist'), requireManagerSection('payments', 'fees'), validate(createRazorpayOrderSchema), async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'member' && !req.body.memberId) {
      res.status(400).json({ error: 'memberId is required for staff-initiated online payment order' });
      return;
    }

    const member = req.user?.role === 'member'
      ? await prisma.member.findFirst({
          where: { gymId: req.gymId!, userId: req.user.userId },
          include: {
            user: { select: { name: true, phone: true } },
            subscriptions: {
              include: { plan: true },
              orderBy: { endDate: 'desc' },
              take: 1,
            },
            gym: { select: { name: true } },
          },
        })
      : await prisma.member.findFirst({
          where: { id: req.body.memberId, gymId: req.gymId! },
          include: {
            user: { select: { name: true, phone: true } },
            subscriptions: {
              include: { plan: true },
              orderBy: { endDate: 'desc' },
              take: 1,
            },
            gym: { select: { name: true } },
          },
        });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const activeSub = member.subscriptions[0];
    if (!activeSub) {
      res.status(400).json({ error: 'No active subscription found for this member' });
      return;
    }

    const daysRemaining = Math.ceil(
      (new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysRemaining > 7) {
      res.status(400).json({ error: 'Online payment is available only when fee is due' });
      return;
    }

    const amount = Number(activeSub.plan.price);
    const receipt = `MEM-${member.memberCode}-${Date.now()}`.slice(0, 40);

    const order = await razorpayService.createOrder({
      amountPaise: Math.round(amount * 100),
      receipt,
      notes: {
        gymId: req.gymId!,
        memberId: member.id,
        memberCode: member.memberCode,
        planName: activeSub.plan.name,
      },
    });

    res.status(201).json({
      keyId: razorpayService.getRazorpayKeyId(),
      orderId: order.id,
      amount,
      currency: order.currency,
      memberId: member.id,
      memberName: member.user.name,
      memberPhone: member.user.phone,
      gymName: member.gym.name,
      description: `${activeSub.plan.name} membership renewal`,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/razorpay/verify', requireRole('member', 'gym_owner', 'manager', 'receptionist'), requireManagerSection('payments', 'fees'), validate(verifyRazorpayPaymentSchema), async (req: Request, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const isValid = razorpayService.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      res.status(400).json({ error: 'Payment signature verification failed' });
      return;
    }

    const member = req.user?.role === 'member'
      ? await prisma.member.findFirst({
          where: { gymId: req.gymId!, userId: req.user.userId },
        })
      : null;

    if (req.user?.role === 'member' && !member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const order = await razorpayService.fetchOrder(razorpayOrderId);
    if (order.notes?.gymId && order.notes.gymId !== req.gymId) {
      res.status(403).json({ error: 'This payment order does not belong to the authenticated gym' });
      return;
    }
    const orderMemberId = (order.notes?.memberId as string | undefined) || member?.id;

    if (!orderMemberId) {
      res.status(400).json({ error: 'Unable to resolve member for this payment order' });
      return;
    }

    if (member?.id && orderMemberId !== member.id) {
      res.status(403).json({ error: 'This payment order does not belong to the authenticated member' });
      return;
    }

    const amount = Number(order.amount) / 100;

    const result = await paymentService.createRazorpayPayment(req.gymId!, {
      memberId: orderMemberId,
      amount,
      razorpayOrderId,
      razorpayPaymentId,
      notes: `Paid via Razorpay order ${razorpayOrderId}`,
    });

    res.status(result.alreadyExists ? 200 : 201).json({
      payment: result.payment,
      invoiceNumber: result.invoiceNumber,
      alreadyExists: result.alreadyExists,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
