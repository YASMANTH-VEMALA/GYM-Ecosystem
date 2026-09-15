import prisma from '@gymstack/db';
import { Prisma } from '@gymstack/db';
import type { PaymentHistoryQuery } from '@gymstack/shared';
import { generateInvoicePdf } from '../utils/gst-invoice';

async function getNextInvoiceNumber(gymId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.payment.count({
    where: { gymId, paidAt: { gte: new Date(`${year}-01-01`) } },
  });

  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { slug: true } });
  const prefix = gym?.slug?.toUpperCase().slice(0, 6) || 'GYM';
  return `INV-${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function collectPayment(gymId: string, data: {
  memberId: string;
  subscriptionId?: string;
  amount: number;
  paymentMethod: string;
  upiRef?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  paymentStatus?: string;
  paidAt?: Date;
  notes?: string;
}) {
  const member = await prisma.member.findFirst({
    where: { id: data.memberId, gymId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!member) throw new Error('Member not found');

  if (data.subscriptionId) {
    const subscription = await prisma.memberSubscription.findFirst({
      where: { id: data.subscriptionId, gymId, memberId: data.memberId },
      select: { id: true },
    });
    if (!subscription) throw new Error('Subscription not found for this member');
  }

  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) throw new Error('Gym not found');

  const gstPercent = 18;
  const gstAmount = Math.round((data.amount * gstPercent) / (100 + gstPercent) * 100) / 100;
  const baseAmount = data.amount - gstAmount;
  const invoiceNumber = await getNextInvoiceNumber(gymId);

  const payment = await prisma.payment.create({
    data: {
      memberId: data.memberId,
      gymId,
      subscriptionId: data.subscriptionId,
      amount: baseAmount,
      gstAmount,
      totalAmount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus ?? 'completed',
      razorpayPaymentId: data.razorpayPaymentId,
      razorpayOrderId: data.razorpayOrderId,
      upiRef: data.upiRef,
      invoiceNumber,
      notes: data.notes,
      paidAt: data.paidAt,
    },
  });

  // Generate invoice PDF
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateInvoicePdf({
      invoiceNumber,
      gym: { name: gym.name, address: gym.address || '', gstin: gym.gstin || '' },
      member: { name: member.user.name, phone: member.user.phone, memberCode: member.memberCode },
      baseAmount,
      gstAmount,
      totalAmount: data.amount,
      paymentMethod: data.paymentMethod,
      paidAt: payment.paidAt,
    });
  } catch (error) {
    console.error(`Invoice PDF generation failed for payment ${payment.id}:`, (error as Error).message);
  }

  // TODO: Upload PDF to R2 and update payment.invoiceUrl

  return { payment, invoiceNumber, pdfBuffer };
}

export async function createRazorpayPayment(gymId: string, data: {
  memberId: string;
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  notes?: string;
}) {
  const existing = await prisma.payment.findFirst({
    where: {
      gymId,
      razorpayPaymentId: data.razorpayPaymentId,
    },
  });
  if (existing) {
    return { payment: existing, invoiceNumber: existing.invoiceNumber, alreadyExists: true };
  }

  const result = await collectPayment(gymId, {
    memberId: data.memberId,
    amount: data.amount,
    paymentMethod: 'razorpay',
    paymentStatus: 'completed',
    razorpayPaymentId: data.razorpayPaymentId,
    razorpayOrderId: data.razorpayOrderId,
    notes: data.notes,
  });

  return { ...result, alreadyExists: false };
}

export async function createSubscription(gymId: string, data: {
  memberId: string;
  planId: string;
  startDate: string;
  paymentMethod: string;
  upiRef?: string;
}) {
  const plan = await prisma.membershipPlan.findFirst({ where: { id: data.planId, gymId } });
  if (!plan) throw new Error('Plan not found');
  const member = await prisma.member.findFirst({ where: { id: data.memberId, gymId }, select: { id: true } });
  if (!member) throw new Error('Member not found');

  const startDate = new Date(data.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  const totalAmount = Number(plan.price);
  const gstAmount = Math.round((totalAmount * Number(plan.gstPercent)) / (100 + Number(plan.gstPercent)) * 100) / 100;

  const subscription = await prisma.$transaction(async (tx) => {
    await tx.memberSubscription.updateMany({
      where: { memberId: data.memberId, gymId, status: 'active' },
      data: { status: 'expired' },
    });
    return tx.memberSubscription.create({
      data: {
        memberId: data.memberId,
        planId: data.planId,
        gymId,
        startDate,
        endDate,
        status: 'active',
        amountPaid: totalAmount,
      },
    });
  });

  // Collect payment
  const paymentResult = await collectPayment(gymId, {
    memberId: data.memberId,
    subscriptionId: subscription.id,
    amount: totalAmount,
    paymentMethod: data.paymentMethod,
    upiRef: data.upiRef,
  });

  return { subscription, payment: paymentResult.payment, invoiceUrl: null };
}

function paymentHistoryWhere(gymId: string, options: Omit<PaymentHistoryQuery, 'page' | 'limit'>) {
  const { memberId, search, from, to, method } = options;
  const where: Prisma.PaymentWhereInput = { gymId };

  if (memberId) where.memberId = memberId;
  if (method) where.paymentMethod = method;
  if (from || to) {
    const paidAt: Prisma.DateTimeFilter = {};
    if (from) paidAt.gte = new Date(`${from}T00:00:00.000+05:30`);
    if (to) paidAt.lte = new Date(`${to}T23:59:59.999+05:30`);
    where.paidAt = paidAt;
  }
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { member: { memberCode: { contains: search, mode: 'insensitive' } } },
      { member: { user: { name: { contains: search, mode: 'insensitive' } } } },
      { member: { user: { phone: { contains: search } } } },
    ];
  }

  return where;
}

const paymentHistoryInclude = {
  member: { include: { user: { select: { name: true, phone: true } } } },
  subscription: { include: { plan: { select: { name: true } } } },
} satisfies Prisma.PaymentInclude;

export async function getPayments(gymId: string, options: PaymentHistoryQuery) {
  const { page = 1, limit = 20, ...filters } = options;
  const skip = (page - 1) * limit;
  const where = paymentHistoryWhere(gymId, filters);

  const [payments, total, aggregate] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: paymentHistoryInclude,
      orderBy: { paidAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { totalAmount: true } }),
  ]);

  return {
    payments,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: { totalAmount: Number(aggregate._sum.totalAmount ?? 0) },
  };
}

export async function getPaymentExportRows(
  gymId: string,
  options: Omit<PaymentHistoryQuery, 'page' | 'limit'>,
) {
  return prisma.payment.findMany({
    where: paymentHistoryWhere(gymId, options),
    include: paymentHistoryInclude,
    orderBy: { paidAt: 'desc' },
  });
}

export async function getDueMembers(gymId: string) {
  const today = new Date();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const expiringSubs = await prisma.memberSubscription.findMany({
    where: {
      gymId,
      status: 'active',
      endDate: { lte: sevenDaysFromNow },
    },
    include: {
      member: { include: { user: { select: { name: true, phone: true } } } },
      plan: { select: { name: true, price: true } },
    },
  });

  return expiringSubs.map((sub) => ({
    subscriptionId: sub.id,
    memberId: sub.memberId,
    memberName: sub.member.user.name,
    memberCode: sub.member.memberCode,
    memberPhone: sub.member.user.phone,
    planName: sub.plan.name,
    expiredOn: sub.endDate.toISOString(),
    amount: Number(sub.plan.price),
  }));
}
