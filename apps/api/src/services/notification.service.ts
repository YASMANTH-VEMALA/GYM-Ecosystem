import prisma from '@gymstack/db';
import { Resend } from 'resend';
import { env } from '../config/env';
import { sendWebPushToUser } from './web-push.service';
import { renderThemedEmail } from '../utils/email-themes';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function getNotificationRecipients(gymId: string) {
  const members = await prisma.member.findMany({
    where: { gymId },
    select: {
      id: true,
      memberCode: true,
      user: {
        select: {
          name: true,
          email: true,
          _count: { select: { webPushSubscriptions: true } },
        },
      },
      subscriptions: {
        where: { status: 'active' },
        select: { endDate: true, plan: { select: { name: true, price: true } } },
        orderBy: { endDate: 'desc' },
        take: 1,
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const now = Date.now();
  const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);

  return members.map((member) => {
    const subscription = member.subscriptions[0];
    const endDate = subscription?.endDate.getTime();
    const audience = !subscription
      ? 'inactive'
      : endDate! < now
        ? 'overdue'
        : endDate! <= sevenDaysFromNow
          ? 'expiring_soon'
          : 'active';

    return {
      id: member.id,
      memberCode: member.memberCode,
      name: member.user.name,
      email: member.user.email,
      pushEnabled: member.user._count.webPushSubscriptions > 0,
      audience,
      paymentDue: Boolean(subscription && endDate! <= sevenDaysFromNow),
      planName: subscription?.plan.name ?? null,
      dueDate: subscription?.endDate.toISOString() ?? null,
      amount: subscription ? Number(subscription.plan.price) : null,
    };
  });
}

export async function getNotificationHistory(gymId: string, params: {
  page?: number;
  limit?: number;
  memberId?: string;
  statuses?: string[];
}) {
  const { page = 1, limit = 20, memberId, statuses } = params;
  const skip = (page - 1) * limit;
  const where = {
    gymId,
    ...(memberId ? { memberId } : {}),
    ...(statuses?.length ? { status: { in: statuses } } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      // Fetch more than limit to account for deduplication when memberId is set
      skip: memberId ? 0 : skip,
      take: memberId ? limit * 4 : limit,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  // When viewing a specific member's notifications, deduplicate records that
  // were created by a "both" channel send (which creates one email + one push
  // record for the same message). Group by title+body+createdAt-minute.
  if (memberId) {
    const seen = new Map<string, typeof notifications[0]>();
    for (const n of notifications) {
      const minute = new Date(n.createdAt);
      minute.setSeconds(0, 0);
      const key = `${n.title}::${n.body}::${minute.getTime()}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, n);
      } else {
        // Merge: if we have both email and push, mark channel as 'both'
        const channels = new Set([existing.channel, n.channel]);
        if (channels.has('email') && channels.has('push')) {
          existing.channel = 'both' as typeof existing.channel;
        }
        // Prefer the delivered record's sentAt
        if (n.status === 'delivered' && existing.status !== 'delivered') {
          existing.status = n.status;
          existing.sentAt = n.sentAt;
        }
      }
    }
    const deduplicated = Array.from(seen.values()).slice(skip, skip + limit);
    return { notifications: deduplicated, total: Math.ceil(seen.size), page, limit };
  }

  return { notifications, total, page, limit };
}


export async function sendNotification(gymId: string, data: {
  title: string;
  body: string;
  channel: 'email' | 'push' | 'both';
  target: 'all' | 'active' | 'expiring_soon' | 'overdue' | 'payment_due' | 'plan' | 'individual' | 'selected';
  targetId?: string;
  targetIds?: string[];
  scheduledAt?: string;
  theme?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}) {
  const {
    title,
    body,
    channel,
    target,
    targetId,
    targetIds,
    scheduledAt,
    theme,
    attachmentUrl,
    attachmentName,
    attachmentType,
  } = data;

  const status = scheduledAt ? 'scheduled' : 'pending';
  const metadata = {
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(theme ? { theme } : {}),
    ...(attachmentUrl ? { attachmentUrl, attachmentName, attachmentType } : {}),
  };

  let memberIds: string[] = [];

  if (target === 'all') {
    const members = await prisma.member.findMany({
      where: { gymId },
      select: { id: true },
    });
    memberIds = members.map((m) => m.id);
  } else if (target === 'active') {
    const subscriptions = await prisma.memberSubscription.findMany({
      where: { gymId, status: 'active', endDate: { gte: new Date() } },
      select: { memberId: true },
    });
    memberIds = subscriptions.map((s) => s.memberId);
  } else if (target === 'expiring_soon') {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const subscriptions = await prisma.memberSubscription.findMany({
      where: {
        gymId,
        status: 'active',
        endDate: { gte: now, lte: sevenDaysFromNow },
      },
      select: { memberId: true },
    });
    memberIds = subscriptions.map((s) => s.memberId);
  } else if (target === 'overdue') {
    const subscriptions = await prisma.memberSubscription.findMany({
      where: {
        gymId,
        status: 'active',
        endDate: { lt: new Date() },
      },
      select: { memberId: true },
    });
    memberIds = subscriptions.map((s) => s.memberId);
  } else if (target === 'payment_due') {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const subscriptions = await prisma.memberSubscription.findMany({
      where: { gymId, status: 'active', endDate: { lte: sevenDaysFromNow } },
      select: { memberId: true },
    });
    memberIds = subscriptions.map((subscription) => subscription.memberId);
  } else if (target === 'plan') {
    if (!targetId) throw new Error('targetId is required for plan target');
    const subscriptions = await prisma.memberSubscription.findMany({
      where: { planId: targetId, status: 'active', member: { gymId } },
      select: { memberId: true },
    });
    memberIds = subscriptions.map((s) => s.memberId);
  } else if (target === 'individual') {
    if (!targetId) throw new Error('targetId is required for individual target');
    const member = await prisma.member.findFirst({
      where: { id: targetId, gymId },
    });
    if (!member) throw new Error('Member not found');
    memberIds = [targetId];
  } else if (target === 'selected') {
    if (!targetIds?.length) throw new Error('Select at least one member');
    const members = await prisma.member.findMany({
      where: { gymId, id: { in: Array.from(new Set(targetIds)) } },
      select: { id: true },
    });
    if (members.length !== new Set(targetIds).size) throw new Error('One or more selected members are invalid');
    memberIds = members.map((member) => member.id);
  }

  if (memberIds.length === 0) {
    return { sent: 0 };
  }

  memberIds = Array.from(new Set(memberIds));

  // Load gym details for themed email branding
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { name: true, logoUrl: true, organization: { select: { name: true, logoUrl: true } } },
  });
  const gymName = gym?.name || gym?.organization?.name || 'Gym';
  const gymLogoUrl = gym?.logoUrl || gym?.organization?.logoUrl || undefined;

  // Prepare Resend email attachments once if an attachment is provided
  let resendAttachments: Array<{ filename: string; content: Buffer }> | undefined;
  if (attachmentUrl && resend) {
    try {
      const response = await fetch(attachmentUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        resendAttachments = [{
          filename: attachmentName || (attachmentType?.startsWith('image/') ? 'image.jpg' : 'document.pdf'),
          content: Buffer.from(arrayBuffer),
        }];
      }
    } catch (err) {
      console.warn('Could not fetch attachment buffer for email delivery:', err);
    }
  }

  const members = await prisma.member.findMany({
    where: { gymId, id: { in: memberIds } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      subscriptions: {
        where: { status: 'active' },
        include: { plan: true },
        orderBy: { endDate: 'desc' },
        take: 1,
      },
    },
  });

  const deliveryChannels: Array<'email' | 'push'> = channel === 'both' ? ['email', 'push'] : [channel];
  const logGroups = await Promise.all(members.map(async (member) => {
    const subscription = member.subscriptions[0];
    const replacements: Record<string, string> = {
      '{name}': member.user.name,
      '{firstName}': member.user.name.trim().split(/\s+/)[0] ?? member.user.name,
      '{memberCode}': member.memberCode,
      '{plan}': subscription?.plan.name ?? 'your membership',
      '{dueDate}': subscription?.endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) ?? 'the due date',
      '{amount}': subscription ? `₹${Number(subscription.plan.price).toLocaleString('en-IN')}` : 'the amount due',
    };
    const personalize = (value: string) => Object.entries(replacements).reduce((result, [tag, replacement]) => result.replaceAll(tag, replacement), value);
    const personalizedTitle = personalize(title);
    const personalizedBody = personalize(body);

    const themedHtml = renderThemedEmail({
      theme,
      gymName,
      gymLogoUrl,
      title: personalizedTitle,
      body: personalizedBody,
      attachmentUrl,
      attachmentName,
      attachmentType,
    });

    return Promise.all(deliveryChannels.map(async (deliveryChannel) => {
      let deliveryStatus = status;
      let providerId: string | undefined;
      let failureReason: string | undefined;
      let pushDevices: number | undefined;

      if (!scheduledAt && deliveryChannel === 'email') {
        if (!resend || !member.user.email) {
          deliveryStatus = 'failed';
          failureReason = !resend ? 'Resend is not configured' : 'Member email is missing';
        } else {
          const { data: delivery, error } = await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to: member.user.email,
            subject: personalizedTitle,
            text: personalizedBody,
            html: themedHtml,
            attachments: resendAttachments,
          });
          deliveryStatus = error ? 'failed' : 'delivered';
          providerId = delivery?.id;
          failureReason = error?.message;
        }
      } else if (!scheduledAt && deliveryChannel === 'push') {
        const result = await sendWebPushToUser(member.user.id, {
          title: personalizedTitle,
          body: personalizedBody,
          tag: `manual-${gymId}`,
        });
        deliveryStatus = result.delivered > 0 ? 'delivered' : 'failed';
        pushDevices = result.devices;
        failureReason = result.reason;
      }

      return prisma.notificationLog.create({
        data: {
          gymId,
          memberId: member.id,
          type: 'manual',
          channel: deliveryChannel,
          status: deliveryStatus,
          title: personalizedTitle,
          body: personalizedBody,
          metadata: { ...(metadata ?? {}), providerId, recipient: member.user.email, pushDevices, failureReason },
          sentAt: deliveryStatus === 'delivered' ? new Date() : undefined,
        },
      });
    }));
  }));
  const logs = logGroups.flat();

  return {
    sent: logs.filter((log) => log.status === 'delivered').length,
    failed: logs.filter((log) => log.status === 'failed').length,
    scheduled: logs.filter((log) => log.status === 'scheduled').length,
  };
}

export async function getScheduledNotifications(gymId: string) {
  const notifications = await prisma.notificationLog.findMany({
    where: { gymId, status: 'scheduled' },
    include: {
      member: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return notifications;
}

export async function sendDueScheduledNotifications() {
  const candidates = await prisma.notificationLog.findMany({
    where: { status: 'scheduled', channel: { in: ['email', 'push'] } },
    include: { member: { include: { user: { select: { id: true, email: true } } } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  const now = Date.now();
  let processed = 0;

  for (const notification of candidates) {
    const metadata = notification.metadata && typeof notification.metadata === 'object' && !Array.isArray(notification.metadata)
      ? notification.metadata as Record<string, unknown>
      : {};
    const scheduledAt = typeof metadata.scheduledAt === 'string' ? Date.parse(metadata.scheduledAt) : Number.NaN;
    if (!Number.isFinite(scheduledAt) || scheduledAt > now) continue;

    const claim = await prisma.notificationLog.updateMany({
      where: { id: notification.id, status: 'scheduled' },
      data: { status: 'processing' },
    });
    if (claim.count !== 1) continue;

    processed += 1;
    const recipient = notification.member?.user.email;
    let status = 'failed';
    let providerId: string | undefined;
    let failureReason: string | undefined;

    try {
      if (notification.channel === 'push') {
        if (!notification.member) throw new Error('Member is missing');
        const result = await sendWebPushToUser(notification.member.user.id, {
          title: notification.title ?? 'GymOS notification',
          body: notification.body ?? '',
          tag: `scheduled-${notification.id}`,
        });
        if (result.delivered === 0) throw new Error(result.reason ?? 'Push delivery failed');
        status = 'delivered';
      } else {
        if (!resend) throw new Error('Resend is not configured');
        if (!recipient) throw new Error('Member email is missing');

        const gym = await prisma.gym.findUnique({
          where: { id: notification.gymId },
          select: { name: true, logoUrl: true, organization: { select: { name: true, logoUrl: true } } },
        });
        const gymName = gym?.name || gym?.organization?.name || 'Gym';
        const gymLogoUrl = gym?.logoUrl || gym?.organization?.logoUrl || undefined;

        const attachmentUrl = typeof metadata.attachmentUrl === 'string' ? metadata.attachmentUrl : undefined;
        const attachmentName = typeof metadata.attachmentName === 'string' ? metadata.attachmentName : undefined;
        const attachmentType = typeof metadata.attachmentType === 'string' ? metadata.attachmentType : undefined;
        const theme = typeof metadata.theme === 'string' ? metadata.theme : undefined;

        let resendAttachments: Array<{ filename: string; content: Buffer }> | undefined;
        if (attachmentUrl) {
          try {
            const resp = await fetch(attachmentUrl);
            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              resendAttachments = [{
                filename: attachmentName || (attachmentType?.startsWith('image/') ? 'image.jpg' : 'document.pdf'),
                content: Buffer.from(arrayBuffer),
              }];
            }
          } catch (fetchErr) {
            console.warn('Could not fetch attachment for scheduled email delivery:', fetchErr);
          }
        }

        const themedHtml = renderThemedEmail({
          theme,
          gymName,
          gymLogoUrl,
          title: notification.title ?? 'GymOS notification',
          body: notification.body ?? '',
          attachmentUrl,
          attachmentName,
          attachmentType,
        });

        const { data, error } = await resend.emails.send({
          from: env.RESEND_FROM_EMAIL,
          to: recipient,
          subject: notification.title ?? 'GymOS notification',
          text: notification.body ?? '',
          html: themedHtml,
          attachments: resendAttachments,
        });
        if (error) throw new Error(error.message);
        status = 'delivered';
        providerId = data?.id;
      }
    } catch (error) {
      failureReason = (error as Error).message;
    }

    await prisma.notificationLog.update({
      where: { id: notification.id },
      data: {
        status,
        sentAt: status === 'delivered' ? new Date() : null,
        metadata: { ...metadata, providerId, recipient, failureReason },
      },
    });
  }

  return { processed };
}
