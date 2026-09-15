import bcrypt from 'bcryptjs';
import prisma from '@gymstack/db';
import { supabaseAdmin } from '../config/supabase';
import { DefaultManagerPortalSections, isPortalSection, type PortalSection } from '@gymstack/shared';

const STAFF_ROLES = ['manager', 'receptionist', 'coach'] as const;

export async function getStaff(gymId: string) {
  const staff = await prisma.user.findMany({
    where: { gymId, role: { in: [...STAFF_ROLES] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      portalSections: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return staff;
}

export async function createStaff(
  gymId: string,
  data: { name: string; email: string; phone: string; role: string; password: string; portalSections?: PortalSection[] },
) {
  if (!STAFF_ROLES.includes(data.role as (typeof STAFF_ROLES)[number])) {
    throw new Error('Role must be manager, receptionist, or coach');
  }

  // Check for duplicate phone within the same gym
  const existing = await prisma.user.findFirst({
    where: { phone: data.phone, gymId },
  });
  if (existing) throw new Error('A user with this phone number already exists in this gym');

  if (!data.email) throw new Error('Email is required for Supabase sign-in');
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { organizationId: true } });
  if (!gym) throw new Error('Branch not found');
  const passwordHash = await bcrypt.hash(data.password, 12);
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
  if (authError || !authData.user) throw new Error(authError?.message ?? 'Could not create staff login');

  try {
    const user = await prisma.user.create({
    data: {
      authId: authData.user.id,
      organizationId: gym.organizationId,
      gymId,
      role: data.role,
      portalSections: data.role === 'manager' ? (data.portalSections ?? DefaultManagerPortalSections) : [],
      phone: data.phone,
      email: data.email,
      passwordHash,
      name: data.name,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      portalSections: true,
      isActive: true,
      createdAt: true,
    },
    });

    return user;
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw error;
  }
}

export async function updateManagerPortalSections(id: string, gymId: string, portalSections: string[]) {
  const manager = await prisma.user.findFirst({ where: { id, gymId, role: 'manager' }, select: { id: true } });
  if (!manager) throw new Error('Branch manager not found');

  return prisma.user.update({
    where: { id },
    data: { portalSections: [...new Set(portalSections.filter(isPortalSection))] },
    select: { id: true, name: true, role: true, portalSections: true },
  });
}

export async function toggleStaffStatus(id: string, gymId: string) {
  const user = await prisma.user.findFirst({
    where: { id, gymId, role: { in: [...STAFF_ROLES] } },
  });
  if (!user) throw new Error('Staff member not found');

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  });

  return updated;
}

export async function resetStaffPassword(id: string, gymId: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { id, gymId, role: { in: [...STAFF_ROLES] } },
  });
  if (!user) throw new Error('Staff member not found');

  const passwordHash = await bcrypt.hash(newPassword, 12);

  if (!user.authId) throw new Error('Staff account is not linked to Supabase Auth');
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.authId, { password: newPassword });
  if (error) throw new Error(error.message);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  return { success: true };
}
