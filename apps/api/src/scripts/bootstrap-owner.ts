import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import prisma from '@gymstack/db';

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const email = required('BOOTSTRAP_OWNER_EMAIL').toLowerCase();
  const name = required('BOOTSTRAP_OWNER_NAME');
  const phone = required('BOOTSTRAP_OWNER_PHONE');
  const gymName = required('BOOTSTRAP_GYM_NAME');
  const slug = required('BOOTSTRAP_GYM_SLUG').toLowerCase();
  const suppliedPassword = process.env.BOOTSTRAP_OWNER_PASSWORD?.trim();
  const password = suppliedPassword || crypto.randomBytes(18).toString('base64url');

  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('BOOTSTRAP_OWNER_EMAIL must be a valid email');
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('BOOTSTRAP_OWNER_PHONE must be a 10-digit Indian mobile number');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('BOOTSTRAP_GYM_SLUG must use lowercase letters, numbers, and hyphens');
  if (password.length < 12) throw new Error('BOOTSTRAP_OWNER_PASSWORD must be at least 12 characters');

  const [existingGym, existingUser] = await Promise.all([
    prisma.gym.findUnique({ where: { slug } }),
    prisma.user.findFirst({ where: { email } }),
  ]);
  if (existingGym || existingUser) {
    throw new Error('A gym with this slug or a local user with this email already exists');
  }

  const supabaseUrl = required('SUPABASE_URL');
  const serviceKey = required('SUPABASE_SECRET_KEY');
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error(listError.message);
  const existingAuthUser = listed.users.find((user) => user.email?.toLowerCase() === email);
  let authId: string;
  let createdAuthUser = false;
  if (existingAuthUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existingAuthUser.user_metadata, name, role: 'gym_owner' },
    });
    if (error || !data.user) throw new Error(error?.message ?? 'Could not update the existing Supabase owner account');
    authId = data.user.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'gym_owner' },
    });
    if (error || !data.user) throw new Error(error?.message ?? 'Could not create Supabase owner account');
    authId = data.user.id;
    createdAuthUser = true;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const organization = await prisma.organization.create({
      data: {
        name: gymName,
        ownerName: name,
        ownerPhone: phone,
        ownerEmail: email,
        users: {
          create: { authId, role: 'gym_owner', phone, email, passwordHash, name },
        },
        branches: {
          create: {
            name: gymName,
            slug,
            subdomain: slug,
            ownerName: name,
            ownerPhone: phone,
            ownerEmail: email,
            membershipPlans: {
              create: [
                { name: 'Monthly', durationDays: 30, price: 1500, gstPercent: 18 },
                { name: 'Quarterly', durationDays: 90, price: 4000, gstPercent: 18 },
                { name: 'Annual', durationDays: 365, price: 12000, gstPercent: 18 },
              ],
            },
          },
        },
      },
      select: { branches: { select: { id: true, name: true, slug: true }, take: 1 } },
    });
    const gym = organization.branches[0];

    console.log(JSON.stringify({
      created: true,
      gym,
      owner: { email, name, phone },
      temporaryPassword: suppliedPassword ? '(the supplied password)' : password,
      instruction: 'Sign in once, then change the temporary password in Settings > Account.',
    }, null, 2));
  } catch (error) {
    if (createdAuthUser) await supabase.auth.admin.deleteUser(authId);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
