import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function createServerSupabaseClient({ cookies, headers } = {}) {
  const options = {};

  if (cookies) {
    options.cookies = cookies;
  }

  if (headers) {
    options.headers = headers;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        ...(headers || {}),
      },
    },
    cookies,
  });
}

export async function requireAuthenticatedUser(supabaseClient = createServerSupabaseClient()) {
  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required');
  }

  return user;
}

export async function getApplicationUserByAuthUserId(supabaseClient, authUserId) {
  if (!authUserId) return null;

  const { data, error } = await supabaseClient
    .from('"User"')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function isSuperAdmin(supabaseClient = createServerSupabaseClient()) {
  try {
    const user = await requireAuthenticatedUser(supabaseClient);
    const appUser = await getApplicationUserByAuthUserId(supabaseClient, user.id);

    return Boolean(
      appUser &&
      appUser.auth_user_id === user.id &&
      appUser.app_role === 'SUPER_ADMIN' &&
      appUser.status === 'ACTIVE'
    );
  } catch {
    return false;
  }
}

export async function requireSuperAdmin(supabaseClient = createServerSupabaseClient()) {
  const user = await requireAuthenticatedUser(supabaseClient);
  const appUser = await getApplicationUserByAuthUserId(supabaseClient, user.id);

  if (!appUser || appUser.auth_user_id !== user.id || appUser.app_role !== 'SUPER_ADMIN' || appUser.status !== 'ACTIVE') {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  return appUser;
}
