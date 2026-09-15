import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase browser configuration is missing');
  }
}

// A non-routable fallback lets Next.js prerender public/error pages in CI. All
// actual auth operations call assertSupabaseConfigured first.
export const supabase = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseKey ?? 'missing-publishable-key',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  },
);
