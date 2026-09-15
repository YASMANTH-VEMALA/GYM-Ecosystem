import { Resend } from 'resend';
import prisma from '@gymstack/db';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

async function deliver(to: string | null | undefined, subject: string, text: string) {
  if (!resend || !to) return { status: 'failed', providerId: null };
  const { data, error } = await resend.emails.send({ from: env.RESEND_FROM_EMAIL, to, subject, text });
  return { status: error ? 'failed' : 'delivered', providerId: data?.id ?? null };
}

async function sendMemberEmail(memberId: string, type: string, title: string, createBody: (name: string, gymName: string, planName?: string) => string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: { select: { name: true, email: true } }, gym: { select: { name: true } }, subscriptions: { where: { status: 'active' }, include: { plan: true }, orderBy: { endDate: 'desc' }, take: 1 } },
  });
  if (!member) throw new Error('Member not found');
  const body = createBody(member.user.name, member.gym.name, member.subscriptions[0]?.plan.name);
  const delivery = await deliver(member.user.email, title, body);
  await prisma.notificationLog.create({ data: { gymId: member.gymId, memberId, type, channel: 'email', status: delivery.status, title, body, sentAt: delivery.status === 'delivered' ? new Date() : undefined, metadata: { providerId: delivery.providerId, recipient: member.user.email } } });
  if (delivery.status === 'failed') throw new Error('Email could not be delivered');
}

export const sendBirthdayEmail = (memberId: string) => sendMemberEmail(memberId, 'birthday_wish', 'Happy birthday!', (name, gym) => `Happy birthday, ${name}! Everyone at ${gym} wishes you a healthy and active year ahead.`);
export const sendFeeReminderEmail = (memberId: string) => sendMemberEmail(memberId, 'fee_reminder', 'Membership renewal reminder', (name, gym, plan) => `Hi ${name}, your ${plan ?? ''} membership at ${gym} is due for renewal soon. Please contact reception.`);
export const sendFeeOverdueEmail = (memberId: string) => sendMemberEmail(memberId, 'fee_overdue', 'Membership renewal due', (name, gym, plan) => `Hi ${name}, your ${plan ?? ''} membership at ${gym} is now due. Please renew it at reception.`);
export const sendInactivityEmail = (memberId: string, days: number) => sendMemberEmail(memberId, 'inactivity_nudge', 'We miss you!', (name, gym) => `Hi ${name}, it has been ${days} days since your last visit to ${gym}. Come back and keep your momentum going.`);
export const sendPlanExpiryEmail = (memberId: string, days: number) => sendMemberEmail(memberId, 'plan_expiry', 'Membership expiring soon', (name, gym, plan) => `Hi ${name}, your ${plan ?? ''} membership at ${gym} expires in ${days} day${days === 1 ? '' : 's'}. Please contact reception to renew.`);

export async function sendOwnerSummaryEmail(gymId: string, subject: string, body: string) {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { ownerEmail: true } });
  const delivery = await deliver(gym?.ownerEmail, subject, body);
  await prisma.notificationLog.create({ data: { gymId, type: 'weekly_summary', channel: 'email', status: delivery.status, title: subject, body, sentAt: delivery.status === 'delivered' ? new Date() : undefined, metadata: { providerId: delivery.providerId, recipient: gym?.ownerEmail } } });
}
