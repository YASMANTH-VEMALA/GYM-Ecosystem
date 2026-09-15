import crypto from 'crypto';
import { env } from '../config/env';
import { supabaseAdmin } from '../config/supabase';

const allowedImages = {
  'image/png': { extension: 'png', matches: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/jpeg': { extension: 'jpg', matches: (bytes: Buffer) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/webp': { extension: 'webp', matches: (bytes: Buffer) => bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP' },
} as const;

type AllowedMime = keyof typeof allowedImages;
const allowedMimeTypes = Object.keys(allowedImages);
const maxLogoBytes = 2 * 1024 * 1024;
let bucketReady: Promise<void> | undefined;

async function prepareBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(env.SUPABASE_LOGO_BUCKET);
  if (data) {
    if (!data.public) {
      const { error } = await supabaseAdmin.storage.updateBucket(env.SUPABASE_LOGO_BUCKET, {
        public: true,
        fileSizeLimit: maxLogoBytes,
        allowedMimeTypes,
      });
      if (error) throw new Error(`Logo storage setup failed: ${error.message}`);
    }
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(env.SUPABASE_LOGO_BUCKET, {
    public: true,
    fileSizeLimit: maxLogoBytes,
    allowedMimeTypes,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Logo storage setup failed: ${error.message}`);
  }
}

async function ensureBucket() {
  bucketReady ??= prepareBucket().catch((error) => {
    bucketReady = undefined;
    throw error;
  });
  await bucketReady;
}

export function validateLogo(file: Express.Multer.File) {
  const definition = allowedImages[file.mimetype as AllowedMime];
  if (!definition || !definition.matches(file.buffer)) {
    throw new Error('Upload a valid PNG, JPG, or WebP image');
  }
  return definition;
}

export async function uploadLogo(organizationId: string, file: Express.Multer.File) {
  const definition = validateLogo(file);
  const key = `organizations/${organizationId}/logos/${crypto.randomUUID()}.${definition.extension}`;
  await ensureBucket();
  const storage = supabaseAdmin.storage.from(env.SUPABASE_LOGO_BUCKET);
  const { error } = await storage.upload(key, file.buffer, {
    contentType: file.mimetype,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Logo upload failed: ${error.message}`);
  return storage.getPublicUrl(key).data.publicUrl;
}

export async function deleteManagedLogo(logoUrl?: string | null) {
  if (!logoUrl) return;
  const prefix = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${env.SUPABASE_LOGO_BUCKET}/`;
  if (!logoUrl.startsWith(prefix)) return;
  const key = decodeURIComponent(logoUrl.slice(prefix.length));
  if (!key.startsWith('organizations/') || key.includes('..')) return;
  const { error } = await supabaseAdmin.storage.from(env.SUPABASE_LOGO_BUCKET).remove([key]);
  if (error) throw new Error(`Logo deletion failed: ${error.message}`);
}
