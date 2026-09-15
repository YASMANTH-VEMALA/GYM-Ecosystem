import prisma from '@gymstack/db';
import webpush from 'web-push';
import { env } from '../config/env';

export type BrowserPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const configured = Boolean(env.WEB_PUSH_VAPID_PUBLIC_KEY && env.WEB_PUSH_VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(
    env.WEB_PUSH_VAPID_SUBJECT,
    env.WEB_PUSH_VAPID_PUBLIC_KEY!,
    env.WEB_PUSH_VAPID_PRIVATE_KEY!,
  );
}

export function getWebPushPublicConfig() {
  return { configured, publicKey: configured ? env.WEB_PUSH_VAPID_PUBLIC_KEY : null };
}

export async function saveWebPushSubscription(userId: string, subscription: BrowserPushSubscription, userAgent?: string) {
  const existing = await prisma.webPushSubscription.findUnique({ where: { endpoint: subscription.endpoint }, select: { userId: true } });
  if (existing && existing.userId !== userId) throw new Error('This notification subscription belongs to another account');
  return prisma.webPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent },
    update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent },
    select: { id: true },
  });
}

export async function removeWebPushSubscription(userId: string, endpoint: string) {
  await prisma.webPushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function getWebPushStatus(userId: string) {
  return { ...getWebPushPublicConfig(), subscriptions: await prisma.webPushSubscription.count({ where: { userId } }) };
}

export async function sendWebPushToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  const subscriptions = await prisma.webPushSubscription.findMany({ where: { userId } });
  if (!configured) return { delivered: 0, failed: subscriptions.length || 1, devices: subscriptions.length, reason: 'Web Push is not configured' };
  let delivered = 0;
  let failed = 0;

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify({ ...payload, url: payload.url ?? '/member-app?tab=notifications' }), {
        TTL: 24 * 60 * 60,
        urgency: 'high',
      });
      delivered += 1;
    } catch (error) {
      failed += 1;
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.webPushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
      }
    }
  }));

  return { delivered, failed, devices: subscriptions.length, reason: subscriptions.length ? undefined : 'No subscribed devices' };
}
