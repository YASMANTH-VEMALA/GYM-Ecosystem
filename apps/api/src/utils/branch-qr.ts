import crypto from 'crypto';
import type { Request } from 'express';
import { env } from '../config/env';

export type BranchQrPurpose = 'admission' | 'attendance';

export function createBranchQrToken(gymId: string, qrSecret: string, purpose: BranchQrPurpose) {
  // Keep the original attendance payload so already-printed production QRs stay valid.
  const payload = purpose === 'attendance'
    ? `${gymId}:${qrSecret}`
    : `${gymId}:${purpose}:${qrSecret}`;
  return crypto.createHmac('sha256', env.QR_ENCRYPTION_KEY).update(payload).digest('hex');
}

export function verifyBranchQrToken(gymId: string, qrSecret: string, purpose: BranchQrPurpose, token: string) {
  if (!/^[0-9a-f]{64}$/i.test(token)) return false;
  const supplied = Buffer.from(token, 'hex');
  const expected = Buffer.from(createBranchQrToken(gymId, qrSecret, purpose), 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

export function resolveWebBaseUrl(req?: Request): string {
  // 1. If explicit production WEB_URL is configured and not localhost, use it
  if (env.WEB_URL && !env.WEB_URL.includes('localhost') && !env.WEB_URL.includes('127.0.0.1')) {
    return env.WEB_URL;
  }
  // 2. Derive from request headers if present (e.g. from reverse proxy or client)
  if (req) {
    const origin = req.get('origin');
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
    const referer = req.get('referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (!refUrl.hostname.includes('localhost') && !refUrl.hostname.includes('127.0.0.1')) {
          return refUrl.origin;
        }
      } catch {
        // ignore invalid URL
      }
    }
    const forwardedHost = req.get('x-forwarded-host');
    const forwardedProto = req.get('x-forwarded-proto') || 'https';
    if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
      return `${forwardedProto}://${forwardedHost}`;
    }
  }
  // 3. Fallback to production web URL if in production / on Vercel
  if (process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)) {
    return 'https://gym-ecosystem-web-theta.vercel.app';
  }
  return env.WEB_URL || 'http://localhost:3000';
}

export function buildBranchQrUrl(gymId: string, token: string, purpose: BranchQrPurpose, req?: Request) {
  const baseUrl = resolveWebBaseUrl(req);
  const url = new URL(purpose === 'attendance' ? '/member-app' : '/admission', baseUrl);
  url.searchParams.set('gymId', gymId);
  // Released Flutter builds read `hash`; admission uses the purpose-neutral name.
  url.searchParams.set(purpose === 'attendance' ? 'hash' : 'token', token);
  return url.toString();
}
