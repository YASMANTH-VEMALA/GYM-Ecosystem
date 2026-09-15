import bcrypt from 'bcryptjs';
import prisma from '@gymstack/db';
import type { CreateMemberInput, UpdateMemberInput } from '@gymstack/shared';
import { Prisma } from '@gymstack/db';
import { supabaseAdmin } from '../config/supabase';

async function generateMemberCode(tx: Prisma.TransactionClient, gymId: string): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ highest: bigint }>>`
    SELECT COALESCE(MAX(CAST(SUBSTRING(member_code FROM 5) AS INTEGER)), 0) AS highest
    FROM members
    WHERE gym_id = ${gymId}::uuid AND member_code ~ '^GYM-[0-9]+$'
  `;
  const next = Number(rows[0]?.highest ?? 0) + 1;
  return `GYM-${String(next).padStart(4, '0')}`;
}

export function friendlyMemberCreationError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(' ') : String(error.meta?.target ?? '');
    if (target.includes('phone')) return 'A member with this phone number already exists in this branch';
    if (target.includes('email') || target.includes('auth_id')) return 'This email address is already linked to an account';
    return 'This member already exists';
  }
  const message = error instanceof Error ? error.message : '';
  if (/already (been )?registered|already exists|duplicate/i.test(message)) return 'This email address is already linked to an account';
  return message || 'Could not complete admission. Please try again.';
}

export async function getMembers(gymId: string, options: {
  search?: string;
  status?: string;
  planId?: string;
  page?: number;
  limit?: number;
}) {
  const { search, status, planId, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.MemberWhereInput = { gymId };

  if (search) {
    where.OR = [
      { memberCode: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search } } },
    ];
  }

  if (status === 'active') {
    where.subscriptions = { some: { status: 'active', endDate: { gte: new Date() } } };
  } else if (status === 'expired') {
    where.subscriptions = { every: { OR: [{ status: 'expired' }, { endDate: { lt: new Date() } }] } };
  }

  if (planId) {
    where.subscriptions = { some: { planId } };
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true, email: true, avatarUrl: true } },
        _count: { select: { checkIns: true } },
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.member.count({ where }),
  ]);

  return { members, total, page, limit };
}

export async function getMemberById(memberId: string, gymId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: {
      user: { select: { name: true, phone: true, email: true, avatarUrl: true } },
      subscriptions: {
        include: { plan: true },
        orderBy: { endDate: 'desc' },
      },
      checkIns: {
        orderBy: { checkedInAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!member) throw new Error('Member not found');

  // Calculate fees due = active subscription with no matching payment? Simplified:
  const activeSubscription = member.subscriptions.find((s) => s.status === 'active');

  const totalVisits = await prisma.checkIn.count({ where: { memberId } });

  return {
    member,
    activeSubscription,
    lastCheckIn: member.checkIns[0]?.checkedInAt.toISOString() || null,
    totalVisits,
  };
}

export async function createMember(gymId: string, data: CreateMemberInput) {
  const defaultPassword = await bcrypt.hash(data.password ?? data.phone.slice(-6), 12);
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { organizationId: true } });
  if (!gym) throw new Error('Branch not found');

  if ((data.email && !data.password) || (!data.email && data.password)) {
    throw new Error('Email and temporary password must be provided together for member app access');
  }

  let authId: string | null = null;
  if (data.email && data.password) {
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
    if (error || !authData.user) throw new Error(error?.message ?? 'Could not create member login');
    authId = authData.user.id;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialise code allocation per branch so simultaneous QR admissions cannot collide.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${gymId}))::text AS locked`;
      const memberCode = await generateMemberCode(tx, gymId);
      const user = await tx.user.create({
        data: {
          authId,
          organizationId: gym.organizationId,
          gymId,
          role: 'member',
          phone: data.phone,
          email: data.email,
          passwordHash: defaultPassword,
          name: data.name,
        },
      });

      const member = await tx.member.create({
        data: {
          userId: user.id,
          gymId,
          memberCode,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender,
          emergencyPhone: data.emergencyPhone,
          bloodGroup: data.bloodGroup,
          notes: data.notes,
        },
      });

      return { user, member };
    });

    return { ...result.member, user: { name: result.user.name, phone: result.user.phone } };
  } catch (error) {
    if (authId) await supabaseAdmin.auth.admin.deleteUser(authId);
    throw error;
  }
}

export async function updateMember(memberId: string, gymId: string, data: UpdateMemberInput) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: { user: { select: { authId: true, email: true } } },
  });
  if (!member) throw new Error('Member not found');

  const emailChanged = data.email !== undefined && data.email !== member.user.email;
  if (emailChanged && !member.user.authId) {
    throw new Error('Create a Supabase login before changing this member email');
  }
  if (emailChanged && member.user.authId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(member.user.authId, { email: data.email, email_confirm: true });
    if (error) throw new Error(error.message);
  }

  const updates: Record<string, unknown> = {};
  if (data.dateOfBirth !== undefined) updates.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  if (data.gender !== undefined) updates.gender = data.gender;
  if (data.emergencyPhone !== undefined) updates.emergencyPhone = data.emergencyPhone;
  if (data.bloodGroup !== undefined) updates.bloodGroup = data.bloodGroup;
  if (data.notes !== undefined) updates.notes = data.notes;

  try {
    const [updatedMember] = await prisma.$transaction([
      prisma.member.update({ where: { id: memberId }, data: updates }),
      ...(data.name || data.phone || data.email
        ? [prisma.user.update({
            where: { id: member.userId },
            data: {
              ...(data.name && { name: data.name }),
              ...(data.phone && { phone: data.phone }),
              ...(data.email && { email: data.email }),
            },
          })]
        : []),
    ]);
    return updatedMember;
  } catch (error) {
    if (emailChanged && member.user.authId && member.user.email) {
      await supabaseAdmin.auth.admin.updateUserById(member.user.authId, { email: member.user.email, email_confirm: true });
    }
    throw error;
  }
}

export async function deleteMember(memberId: string, gymId: string) {
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId }, include: { user: { select: { authId: true } } } });
  if (!member) throw new Error('Member not found');

  // Deleting the user cascades to member
  await prisma.user.delete({ where: { id: member.userId } });
  if (member.user.authId) await supabaseAdmin.auth.admin.deleteUser(member.user.authId);
  return true;
}
