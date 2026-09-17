import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import prisma from '@gymstack/db';

const apiBase = process.env.SMOKE_API_URL ?? 'http://localhost:4000/api';
const suffix = Date.now().toString().slice(-8);
const slug = `smoke-${suffix}`;
const password = `Smoke!${crypto.randomBytes(12).toString('base64url')}`;
const emails = {
  owner: `owner-${slug}@example.com`,
  manager: `manager-${slug}@example.com`,
  staff: `staff-${slug}@example.com`,
  member: `member-${slug}@example.com`,
  admittedMember: `admitted-${slug}@example.com`,
};
const authIds: string[] = [];
let gymId: string | undefined;
let organizationId: string | undefined;
let secondGymId: string | undefined;

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = createClient(env('SUPABASE_URL'), env('SUPABASE_PUBLISHABLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });

async function request(path: string, token: string, init?: RequestInit, expected = 200) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status !== expected) throw new Error(`${init?.method ?? 'GET'} ${path}: expected ${expected}, got ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function publicRequest(path: string, init?: RequestInit, expected = 200) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status !== expected) throw new Error(`${init?.method ?? 'GET'} ${path}: expected ${expected}, got ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

function qrPayload(qrUrl: string) {
  const url = new URL(qrUrl);
  return { gymId: url.searchParams.get('gymId'), token: url.searchParams.get('token') ?? url.searchParams.get('hash') };
}

async function createAuthUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? `Could not create ${email}`);
  authIds.push(data.user.id);
  return data.user.id;
}

async function tokenFor(email: string) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(error?.message ?? `Could not sign in ${email}`);
  return data.session.access_token;
}

async function cleanup() {
  if (gymId) {
    await prisma.memberWorkoutAssignment.deleteMany({ where: { workoutPlan: { gymId } } });
    await prisma.memberDietAssignment.deleteMany({ where: { dietChart: { gymId } } });
    await prisma.notificationLog.deleteMany({ where: { gymId } });
    await prisma.payment.deleteMany({ where: { gymId } });
    await prisma.memberSubscription.deleteMany({ where: { gymId } });
    await prisma.checkIn.deleteMany({ where: { gymId } });
    await prisma.bodyStat.deleteMany({ where: { member: { gymId } } });
    await prisma.member.deleteMany({ where: { gymId } });
    await prisma.workoutPlan.deleteMany({ where: { gymId } });
    await prisma.dietChart.deleteMany({ where: { gymId } });
    await prisma.membershipPlan.deleteMany({ where: { gymId } });
    await prisma.user.deleteMany({ where: organizationId ? { organizationId } : { gymId } });
    await prisma.gym.deleteMany({ where: { id: gymId } });
  }
  if (secondGymId) {
    await prisma.membershipPlan.deleteMany({ where: { gymId: secondGymId } });
    await prisma.gym.deleteMany({ where: { id: secondGymId } });
  }
  if (organizationId) await prisma.organization.deleteMany({ where: { id: organizationId } });
  for (const authId of authIds) await admin.auth.admin.deleteUser(authId);
  await prisma.$disconnect();
}

async function main() {
  const ownerAuthId = await createAuthUser(emails.owner);
  const passwordHash = await bcrypt.hash(password, 12);
  const organization = await prisma.organization.create({
    data: { name: 'GymOS Smoke Test', ownerName: 'Smoke Owner', ownerPhone: `9${suffix}1`.slice(0, 10), ownerEmail: emails.owner },
  });
  organizationId = organization.id;
  const gym = await prisma.gym.create({
    data: {
      organizationId: organization.id,
      name: 'GymOS Smoke Test', slug, subdomain: slug, ownerName: 'Smoke Owner', ownerPhone: `9${suffix}1`.slice(0, 10), ownerEmail: emails.owner,
    },
  });
  gymId = gym.id;
  await prisma.user.create({
    data: { authId: ownerAuthId, organizationId: organization.id, role: 'gym_owner', phone: `9${suffix}1`.slice(0, 10), email: emails.owner, passwordHash, name: 'Smoke Owner' },
  });
  const ownerToken = await tokenFor(emails.owner);
  await request('/auth/me', ownerToken);
  await request('/gym', ownerToken);
  await request('/gym', ownerToken, { method: 'PUT', body: JSON.stringify({ city: 'Test City', primaryColor: '#2563EB' }) });
  await request('/organization', ownerToken);
  const updatedOrganization = (await request('/organization', ownerToken, { method: 'PATCH', body: JSON.stringify({ logoUrl: 'https://cdn.example.com/company-logo.png' }) })).organization;
  if (updatedOrganization.logoUrl !== 'https://cdn.example.com/company-logo.png') throw new Error('Organization logo was not persisted');
  await request('/uploads/logo', ownerToken, { method: 'POST', body: JSON.stringify({}) }, 400);

  const secondBranch = (await request('/branches', ownerToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Smoke Branch Two', slug: `${slug}-two`, city: 'Second City' }),
  }, 201)).branch;
  secondGymId = secondBranch.id;
  await request('/staff', ownerToken, {
    method: 'POST',
    headers: { 'x-gym-id': secondBranch.id },
    body: JSON.stringify({ name: 'Smoke Manager', email: emails.manager, phone: `7${suffix}4`.slice(0, 10), role: 'manager', password }),
  }, 201);
  const managerRecord = await prisma.user.findFirst({ where: { email: emails.manager }, select: { id: true, authId: true } });
  if (managerRecord?.authId) authIds.push(managerRecord.authId);
  const managerToken = await tokenFor(emails.manager);
  await request('/auth/me', managerToken);
  await request('/analytics/dashboard', managerToken);
  await request('/branches/overview', managerToken, undefined, 403);
  await request('/staff', managerToken, undefined, 403);
  await request('/organization', managerToken, undefined, 403);
  const managerGym = await request('/gym', managerToken, { headers: { 'x-gym-id': gym.id } });
  if (managerGym.gym.id !== secondBranch.id) throw new Error('Manager escaped assigned branch scope');
  const managerQr = await request('/gym/qr', managerToken, { headers: { 'x-gym-id': gym.id } });
  if (qrPayload(managerQr.admissionQrData).gymId !== secondBranch.id) throw new Error('Manager QR escaped assigned branch scope');
  if (!managerRecord) throw new Error('Manager record was not created');
  await request(`/staff/${managerRecord.id}/portal-access`, ownerToken, {
    method: 'PATCH', headers: { 'x-gym-id': secondBranch.id }, body: JSON.stringify({ portalSections: ['members'] }),
  });
  await request('/analytics/dashboard', managerToken, undefined, 403);
  await request('/gym/qr', managerToken, undefined, 403);
  await request('/plans', managerToken, undefined, 403);
  await request('/members', managerToken);
  await request('/payments', managerToken, undefined, 403);
  await request('/notifications', managerToken, undefined, 403);
  const scopedMemberId = crypto.randomUUID();
  await request(`/payments?memberId=${scopedMemberId}`, managerToken);
  await request(`/notifications?memberId=${scopedMemberId}`, managerToken);
  await request(`/staff/${managerRecord.id}/portal-access`, ownerToken, {
    method: 'PATCH', headers: { 'x-gym-id': secondBranch.id }, body: JSON.stringify({ portalSections: ['members', 'plans'] }),
  });
  await request('/plans', managerToken);
  const limitedManager = (await request('/auth/me', managerToken)).user;
  if (limitedManager.portalSections.join(',') !== 'members,plans') throw new Error('Manager portal access was not persisted');

  const plan = (await request('/plans', ownerToken, { method: 'POST', body: JSON.stringify({ name: 'Smoke Monthly', durationDays: 30, price: 1500, gstPercent: 18 }) }, 201)).plan;
  const staff = (await request('/staff', ownerToken, { method: 'POST', body: JSON.stringify({ name: 'Smoke Coach', email: emails.staff, phone: `8${suffix}2`.slice(0, 10), role: 'coach', password }) }, 201)).staff;
  const staffRecord = await prisma.user.findUnique({ where: { id: staff.id }, select: { authId: true } });
  if (staffRecord?.authId) authIds.push(staffRecord.authId);
  const staffToken = await tokenFor(emails.staff);
  await request('/auth/me', staffToken);

  const member = (await request('/members', ownerToken, { method: 'POST', body: JSON.stringify({ name: 'Smoke Member', phone: `7${suffix}3`.slice(0, 10), email: emails.member, password }) }, 201)).member;
  const memberRecord = await prisma.member.findUnique({ where: { id: member.id }, include: { user: { select: { authId: true } } } });
  if (memberRecord?.user.authId) authIds.push(memberRecord.user.authId);
  await request('/payments/subscriptions', ownerToken, { method: 'POST', body: JSON.stringify({ memberId: member.id, planId: plan.id, startDate: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' }) }, 201);
  await request(`/bodystats/${member.id}`, ownerToken, { method: 'POST', body: JSON.stringify({ weightKg: 75.5, heightCm: 175 }) }, 201);

  const exercise = await prisma.exercise.findFirst({ orderBy: { name: 'asc' } });
  if (!exercise) throw new Error('Exercise reference data is missing');
  const workout = (await request('/workouts', ownerToken, { method: 'POST', body: JSON.stringify({ name: 'Smoke Workout', days: [{ dayNumber: 1, dayName: 'Day 1', exercises: [{ exerciseId: exercise.id, sets: 3, reps: '10' }] }] }) }, 201)).plan;
  await request(`/workouts/${workout.id}/assign`, ownerToken, { method: 'POST', body: JSON.stringify({ memberIds: [member.id] }) }, 201);
  const diet = (await request('/diets', ownerToken, { method: 'POST', body: JSON.stringify({ name: 'Smoke Diet', totalCalories: 2000, meals: [{ mealType: 'breakfast', mealName: 'Oats', calories: 400, sortOrder: 0 }] }) }, 201)).chart;
  await request(`/diets/${diet.id}/assign`, ownerToken, { method: 'POST', body: JSON.stringify({ memberIds: [member.id] }) }, 201);
  await request('/notifications', ownerToken, { method: 'POST', body: JSON.stringify({ title: 'Smoke notification', body: 'Hello {name}', channel: 'email', target: 'individual', targetId: member.id, scheduledAt: new Date(Date.now() + 86400000).toISOString() }) }, 201);

  const oldQr = await request('/gym/qr', ownerToken);
  const newQr = await request('/gym/qr/regenerate', ownerToken, { method: 'POST' });
  const admissionPayload = qrPayload(newQr.admissionQrData);
  await publicRequest(`/admissions/${admissionPayload.gymId}?token=${admissionPayload.token}`);
  await publicRequest(`/admissions/${admissionPayload.gymId}?token=${'0'.repeat(64)}`, undefined, 404);
  const admissionPhone = `6${suffix}5`.slice(0, 10);
  const admitted = await publicRequest(`/admissions/${admissionPayload.gymId}?token=${admissionPayload.token}`, {
    method: 'POST', body: JSON.stringify({ name: 'QR Admission Member', phone: admissionPhone, email: emails.admittedMember, password, bloodGroup: 'O+' }),
  }, 201);
  const admittedRecord = await prisma.member.findUnique({ where: { id: admitted.member.id }, include: { user: { select: { authId: true } } } });
  if (admittedRecord?.user.authId) authIds.push(admittedRecord.user.authId);
  if (admittedRecord?.gymId !== gym.id) throw new Error('QR admission was assigned to the wrong branch');
  await publicRequest(`/admissions/${admissionPayload.gymId}?token=${admissionPayload.token}`, {
    method: 'POST', body: JSON.stringify({ name: 'Duplicate QR Member', phone: admissionPhone, email: emails.admittedMember, password }),
  }, 409);
  const memberToken = await tokenFor(emails.member);
  const pushStatus = await request('/push/status', memberToken);
  if (!pushStatus.configured) throw new Error('Web Push is not configured for the smoke environment');
  const pushEndpoint = `https://push.example.com/${crypto.randomUUID()}`;
  await request('/push/subscribe', memberToken, { method: 'POST', body: JSON.stringify({ endpoint: pushEndpoint, keys: { p256dh: 'p'.repeat(65), auth: 'a'.repeat(24) } }) }, 201);
  const subscribedStatus = await request('/push/status', memberToken);
  if (subscribedStatus.subscriptions !== 1) throw new Error('Web Push subscription was not persisted');
  await request('/push/subscribe', memberToken, { method: 'DELETE', body: JSON.stringify({ endpoint: pushEndpoint }) });
  const unsubscribedStatus = await request('/push/status', memberToken);
  if (unsubscribedStatus.subscriptions !== 0) throw new Error('Web Push subscription was not removed');
  await request('/members/me', memberToken);
  await request('/workouts/me/active', memberToken);
  await request('/diets/me/active', memberToken);
  await request(`/bodystats/${member.id}`, memberToken);
  await request('/notifications/me', memberToken);
  await request('/checkins/qr', memberToken, { method: 'POST', body: JSON.stringify(qrPayload(oldQr.qrData)) }, 403);
  await request('/checkins/qr', memberToken, { method: 'POST', body: JSON.stringify(qrPayload(newQr.qrData)) }, 201);
  await request('/checkins/today', ownerToken);
  await request('/analytics/dashboard', ownerToken);
  await request('/payments', ownerToken);

  console.log(JSON.stringify({ passed: true, checks: 55 }));
}

main()
  .catch((error) => { console.error((error as Error).message); process.exitCode = 1; })
  .finally(cleanup);
