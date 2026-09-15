import crypto from 'crypto';
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

export function buildBranchQrUrl(gymId: string, token: string, purpose: BranchQrPurpose) {
  const url = new URL(purpose === 'attendance' ? '/member-app' : '/admission', env.WEB_URL);
  url.searchParams.set('gymId', gymId);
  // Released Flutter builds read `hash`; admission uses the purpose-neutral name.
  url.searchParams.set(purpose === 'attendance' ? 'hash' : 'token', token);
  return url.toString();
}
