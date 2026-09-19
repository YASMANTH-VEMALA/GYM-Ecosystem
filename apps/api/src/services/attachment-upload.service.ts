import crypto from 'crypto';
import path from 'path';
import { env } from '../config/env';
import { supabaseAdmin } from '../config/supabase';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const ATTACHMENTS_BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || 'gymstack-attachments';

let bucketReady: Promise<string> | undefined;

async function prepareBucket(): Promise<string> {
  // Try dedicated attachments bucket first
  try {
    const { data } = await supabaseAdmin.storage.getBucket(ATTACHMENTS_BUCKET);
    if (data) {
      if (!data.public) {
        await supabaseAdmin.storage.updateBucket(ATTACHMENTS_BUCKET, {
          public: true,
          fileSizeLimit: MAX_ATTACHMENT_BYTES,
        });
      }
      return ATTACHMENTS_BUCKET;
    }

    const { error } = await supabaseAdmin.storage.createBucket(ATTACHMENTS_BUCKET, {
      public: true,
      fileSizeLimit: MAX_ATTACHMENT_BYTES,
    });
    if (!error || /already exists/i.test(error.message)) {
      return ATTACHMENTS_BUCKET;
    }
  } catch {
    // Ignore and fallback
  }

  // Fallback to logo bucket if attachment bucket creation is restricted
  return env.SUPABASE_LOGO_BUCKET;
}

async function ensureBucket(): Promise<string> {
  bucketReady ??= prepareBucket().catch((error) => {
    bucketReady = undefined;
    throw error;
  });
  return bucketReady;
}

export function validateAttachment(file: Express.Multer.File) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error('Unsupported file type. Please upload a PNG, JPG, WebP, GIF, PDF, or DOC/DOCX file.');
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('File size exceeds the 10 MB limit.');
  }
}

export async function uploadAttachment(gymId: string, file: Express.Multer.File) {
  validateAttachment(file);

  const rawExt = path.extname(file.originalname).slice(1).toLowerCase();
  const safeExt = rawExt || (file.mimetype.startsWith('image/') ? 'jpg' : 'pdf');
  const fileKey = `gyms/${gymId}/attachments/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;

  const bucketName = await ensureBucket();
  const storage = supabaseAdmin.storage.from(bucketName);

  const { error } = await storage.upload(fileKey, file.buffer, {
    contentType: file.mimetype,
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    throw new Error(`Attachment upload failed: ${error.message}`);
  }

  const { data } = storage.getPublicUrl(fileKey);

  return {
    url: data.publicUrl,
    filename: file.originalname || `attachment.${safeExt}`,
    mimeType: file.mimetype,
    size: file.size,
  };
}
