import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@gymstack/db';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// ─── Validation schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  gymName: z.string().trim().min(2).max(200),
  ownerName: z.string().trim().min(2).max(200),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  city: z.string().trim().max(100).optional(),
}).strict();

const setupSchema = z.object({
  gymName: z.string().trim().min(2).max(200),
  ownerName: z.string().trim().min(2).max(200),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  city: z.string().trim().max(100).optional(),
}).strict();

// ─── Helper: build org + gym + user ───────────────────────────────────────────

async function provisionGymOwner({
  authId, gymName, ownerName, phone, email, city,
}: {
  authId: string;
  gymName: string;
  ownerName: string;
  phone: string;
  email: string;
  city?: string;
}) {
  const baseSlug = gymName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: gymName, ownerName, ownerPhone: phone, ownerEmail: email },
    });
    const gym = await tx.gym.create({
      data: {
        organizationId: org.id,
        name: gymName,
        slug: uniqueSlug,
        subdomain: uniqueSlug,
        ownerName,
        ownerPhone: phone,
        ownerEmail: email,
        city: city ?? null,
      },
    });
    await tx.user.create({
      data: {
        authId,
        organizationId: org.id,
        gymId: gym.id,
        role: 'gym_owner',
        name: ownerName,
        phone,
        email,
        passwordHash: '',
      },
    });
  });
}

// ─── POST /auth/register  (email + password sign-up) ──────────────────────────

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  const { gymName, ownerName, phone, email, password, city } = req.body as z.infer<typeof registerSchema>;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? 'Failed to create auth account';
    const lower = msg.toLowerCase();
    if (lower.includes('already registered') || lower.includes('already been registered') || lower.includes('email address is already')) {
      res.status(409).json({ error: 'An account with this email already exists' });
    } else {
      res.status(400).json({ error: msg });
    }
    return;
  }

  const authId = authData.user.id;
  try {
    await provisionGymOwner({ authId, gymName, ownerName, phone, email, city });
    res.status(201).json({ message: 'Registration successful. You can now sign in.' });
  } catch (dbError) {
    await supabaseAdmin.auth.admin.deleteUser(authId).catch(() => undefined);
    console.error('Registration DB error:', dbError);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /auth/setup  (complete profile for OAuth / social sign-in users) ────
//
// Called after Google OAuth when the Supabase user has no matching DB record.
// The bearer token is validated against Supabase but we skip the "user must
// exist in our DB" check — that's what we're about to create.

router.post('/setup', validate(setupSchema), async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verify the Supabase token and get the identity
  let authId: string;
  let email: string;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user?.email) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
    authId = data.user.id;
    email = data.user.email;
  } catch {
    res.status(401).json({ error: 'Could not verify session' });
    return;
  }

  // Reject if a DB record already exists for this auth user
  const existing = await prisma.user.findUnique({ where: { authId } });
  if (existing) {
    res.status(409).json({ error: 'Account is already set up' });
    return;
  }

  const { gymName, ownerName, phone, city } = req.body as z.infer<typeof setupSchema>;
  try {
    await provisionGymOwner({ authId, gymName, ownerName, phone, email, city });
    res.status(201).json({ message: 'Account setup complete.' });
  } catch (dbError) {
    console.error('Setup DB error:', dbError);
    res.status(500).json({ error: 'Setup failed. Please try again.' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        organizationId: true,
        gymId: true,
        role: true,
        portalSections: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        gym: { select: { id: true, name: true, slug: true } },
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            branches: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true, name: true, slug: true, city: true },
            },
          },
        },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const branches = user.role === 'gym_owner'
      ? user.organization?.branches ?? []
      : user.gym ? [user.gym] : [];
    res.json({
      user: { ...user, organization: undefined },
      organization: user.organization ? { id: user.organization.id, name: user.organization.name, logoUrl: user.organization.logoUrl } : null,
      branches,
      gym: user.gym ?? branches[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
