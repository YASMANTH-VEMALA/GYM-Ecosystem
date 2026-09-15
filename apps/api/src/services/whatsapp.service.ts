import prisma from '@gymstack/db';
import { Prisma } from '@gymstack/db';
import { env } from '../config/env';

// ─── WATI Client ──────────────────────────────────────

const WATI_BASE = env.WATI_API_URL || 'https://live-server.wati.io/api/v1';

async function watiRequest(endpoint: string, body: Record<string, unknown>) {
  if (!env.WATI_API_KEY || env.NODE_ENV === 'development') {
    console.log('[WhatsApp DRY-RUN]', endpoint, JSON.stringify(body, null, 2));
    return { result: 'dry-run' };
  }

  const res = await fetch(`${WATI_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WATI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WATI API error: ${res.status} ${text}`);
  }

  return res.json();
}

async function sendTemplateMessage(
  phone: string,
  templateName: string,
  params: { name: string; value: string }[],
) {
  // WATI expects phone without country code prefix in some setups
  const cleanPhone = phone.startsWith('+91') ? phone.slice(3) : phone.startsWith('91') ? phone.slice(2) : phone;

  return watiRequest('/sendTemplateMessage', {
    whatsappNumber: `91${cleanPhone}`,
    template_name: templateName,
    broadcast_name: `auto_${templateName}_${Date.now()}`,
    parameters: params,
  });
}

// ─── Notification Logger ──────────────────────────────

async function logNotification(
  gymId: string,
  memberId: string,
  type: string,
  body: string,
  status: 'sent' | 'failed' = 'sent',
) {
  await prisma.notificationLog.create({
    data: {
      gymId,
      memberId,
      type,
      channel: 'whatsapp',
      status,
      title: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      body,
      sentAt: status === 'sent' ? new Date() : undefined,
    },
  });
}

// ─── Helper: Get member with gym context ──────────────

async function getMemberContext(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      user: { select: { name: true, phone: true } },
      gym: { select: { id: true, name: true } },
      subscriptions: {
        where: { status: 'active' },
        include: { plan: { select: { name: true } } },
        orderBy: { endDate: 'desc' },
        take: 1,
      },
    },
  });

  if (!member) throw new Error('Member not found');

  return {
    name: member.user.name,
    phone: member.user.phone,
    gymId: member.gymId,
    gymName: member.gym.name,
    planName: member.subscriptions[0]?.plan?.name || 'N/A',
    endDate: member.subscriptions[0]?.endDate,
    memberCode: member.memberCode,
  };
}

// ─── Public Functions ─────────────────────────────────

export async function sendFeeReminder(memberId: string) {
  const ctx = await getMemberContext(memberId);
  const dueDate = ctx.endDate ? ctx.endDate.toLocaleDateString('en-IN') : 'soon';

  const message = `Hi ${ctx.name}, your ${ctx.planName} membership at ${ctx.gymName} is due on ${dueDate}. Please pay at the front desk to continue training. 💪`;

  try {
    await sendTemplateMessage(ctx.phone, 'fee_reminder', [
      { name: 'name', value: ctx.name },
      { name: 'plan', value: ctx.planName },
      { name: 'gym', value: ctx.gymName },
      { name: 'date', value: dueDate },
    ]);
    await logNotification(ctx.gymId, memberId, 'fee_reminder', message, 'sent');
  } catch (err) {
    await logNotification(ctx.gymId, memberId, 'fee_reminder', message, 'failed');
    throw err;
  }
}

export async function sendFeeOverdue(memberId: string) {
  const ctx = await getMemberContext(memberId);

  const message = `⚠️ Hi ${ctx.name}, your ${ctx.planName} membership at ${ctx.gymName} is overdue. Please renew immediately at the front desk to avoid any interruption in your training.`;

  try {
    await sendTemplateMessage(ctx.phone, 'fee_overdue', [
      { name: 'name', value: ctx.name },
      { name: 'plan', value: ctx.planName },
      { name: 'gym', value: ctx.gymName },
    ]);
    await logNotification(ctx.gymId, memberId, 'fee_overdue', message, 'sent');
  } catch (err) {
    await logNotification(ctx.gymId, memberId, 'fee_overdue', message, 'failed');
    throw err;
  }
}

export async function sendPlanExpiry(memberId: string, daysLeft: number) {
  const ctx = await getMemberContext(memberId);

  const message = `Your membership at ${ctx.gymName} expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Visit the front desk to renew and keep your fitness journey going! 🏋️`;

  try {
    await sendTemplateMessage(ctx.phone, 'plan_expiry', [
      { name: 'name', value: ctx.name },
      { name: 'gym', value: ctx.gymName },
      { name: 'days', value: String(daysLeft) },
    ]);
    await logNotification(ctx.gymId, memberId, 'plan_expiry', message, 'sent');
  } catch (err) {
    await logNotification(ctx.gymId, memberId, 'plan_expiry', message, 'failed');
    throw err;
  }
}

export async function sendBirthdayWish(memberId: string) {
  const ctx = await getMemberContext(memberId);

  const message = `🎂 Happy Birthday, ${ctx.name}! Wishing you an amazing year ahead. From all of us at ${ctx.gymName} — keep crushing those goals! 💪🎉`;

  try {
    await sendTemplateMessage(ctx.phone, 'birthday_wish', [
      { name: 'name', value: ctx.name },
      { name: 'gym', value: ctx.gymName },
    ]);
    await logNotification(ctx.gymId, memberId, 'birthday_wish', message, 'sent');
  } catch (err) {
    await logNotification(ctx.gymId, memberId, 'birthday_wish', message, 'failed');
    throw err;
  }
}

export async function sendInactivityNudge(memberId: string, daysMissed: number) {
  const ctx = await getMemberContext(memberId);

  const message = `We miss you ${ctx.name}! It's been ${daysMissed} days since your last visit. Your coach is waiting. Come back stronger 💪`;

  try {
    await sendTemplateMessage(ctx.phone, 'inactivity_nudge', [
      { name: 'name', value: ctx.name },
      { name: 'days', value: String(daysMissed) },
    ]);
    await logNotification(ctx.gymId, memberId, 'inactivity_nudge', message, 'sent');
  } catch (err) {
    await logNotification(ctx.gymId, memberId, 'inactivity_nudge', message, 'failed');
    throw err;
  }
}

export async function sendWelcomeMessage(memberId: string) {
  const ctx = await getMemberContext(memberId);

  const message = `Welcome to ${ctx.gymName}, ${ctx.name}! 🎉\n\nYour Member ID: ${ctx.memberCode}\nPlan: ${ctx.planName}\n\nDownload our app to track your workouts, view diet plans, and check your attendance. See you at the gym! 💪`;

  try {
    await sendTemplateMessage(ctx.phone, 'welcome_member', [
      { name: 'name', value: ctx.name },
      { name: 'gym', value: ctx.gymName },
      { name: 'member_code', value: ctx.memberCode },
      { name: 'plan', value: ctx.planName },
    ]);
    await logNotification(ctx.gymId, memberId, 'welcome', message, 'sent');
  } catch (err) {
    await logNotification(ctx.gymId, memberId, 'welcome', message, 'failed');
    throw err;
  }
}

export async function sendWorkoutUpdated(memberId: string, planName: string) {
  const ctx = await getMemberContext(memberId);

  const message = `Coach has updated your workout plan (${planName}). Open the app to check it out. 💪`;

  try {
    await sendTemplateMessage(ctx.phone, 'workout_updated', [
      { name: 'name', value: ctx.name },
      { name: 'plan_name', value: planName },
    ]);
    await logNotification(ctx.gymId, memberId, 'workout_updated', message, 'sent');
  } catch (err) {
    await logNotification(ctx.gymId, memberId, 'workout_updated', message, 'failed');
    throw err;
  }
}

export async function sendBulkMessage(
  gymId: string,
  message: string,
  target: 'all' | 'active' | 'expiring_soon' | 'overdue',
) {
  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  let whereClause: Record<string, unknown> = { gymId };

  switch (target) {
    case 'active':
      whereClause = {
        gymId,
        subscriptions: { some: { status: 'active', endDate: { gte: today } } },
      };
      break;
    case 'expiring_soon':
      whereClause = {
        gymId,
        subscriptions: { some: { status: 'active', endDate: { gte: today, lte: in7Days } } },
      };
      break;
    case 'overdue':
      whereClause = {
        gymId,
        subscriptions: { some: { status: 'active', endDate: { lt: today } } },
      };
      break;
    default: // 'all'
      break;
  }

  const where: Prisma.MemberWhereInput = whereClause as Prisma.MemberWhereInput;

  const members = await prisma.member.findMany({
    where,
    include: { user: { select: { name: true, phone: true } } },
  });

  let sentCount = 0;
  let failedCount = 0;

  // Rate limit: 10 messages per minute
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    try {
      const personalMessage = message.replace('[Name]', member.user.name);
      await sendTemplateMessage(member.user.phone, 'bulk_message', [
        { name: 'message', value: personalMessage },
      ]);
      await logNotification(gymId, member.id, 'bulk_message', personalMessage, 'sent');
      sentCount++;
    } catch {
      failedCount++;
      await logNotification(gymId, member.id, 'bulk_message', message, 'failed');
    }

    // Rate limit: pause every 10 messages for 60 seconds
    if ((i + 1) % 10 === 0 && i + 1 < members.length) {
      await new Promise((resolve) => setTimeout(resolve, 60_000));
    }
  }

  return { total: members.length, sent: sentCount, failed: failedCount };
}
