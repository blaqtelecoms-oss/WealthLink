import { supabase } from '@/lib/supabaseClient';

/**
 * Verify admin access via AdminAllowlist table
 * @param {string} userId - Auth user ID
 * @returns {Promise<{isAdmin: boolean, isSuperAdmin: boolean, accessLevel: string}>}
 */
export async function verifyAdminAccess(userId) {
  if (!userId) {
    return { isAdmin: false, isSuperAdmin: false, accessLevel: null };
  }

  try {
    // Check if user is in AdminAllowlist
    const { data, error } = await supabase
      .from('"AdminAllowlist"')
      .select('access_level, is_active, expires_at')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.warn('Error checking admin allowlist:', error.message);
      return { isAdmin: false, isSuperAdmin: false, accessLevel: null };
    }

    if (!data) {
      return { isAdmin: false, isSuperAdmin: false, accessLevel: null };
    }

    // Check if access has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { isAdmin: false, isSuperAdmin: false, accessLevel: null };
    }

    const accessLevel = data.access_level || '';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'READ_ONLY_ADMIN'].includes(accessLevel);
    const isSuperAdmin = accessLevel === 'SUPER_ADMIN';

    return { isAdmin, isSuperAdmin, accessLevel };
  } catch (error) {
    console.error('Failed to verify admin access:', error);
    return { isAdmin: false, isSuperAdmin: false, accessLevel: null };
  }
}

/**
 * Get current admin user info from AdminAllowlist
 * @param {string} userId - Auth user ID
 * @returns {Promise<{id: string, access_level: string, is_active: boolean, expires_at: string}>}
 */
export async function getAdminUserInfo(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('"AdminAllowlist"')
      .select('id, access_level, is_active, expires_at, created_at')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching admin user info:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get admin user info:', error);
    return null;
  }
}

/**
 * Check if user has required admin role
 * @param {string} userId - Auth user ID
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {Promise<boolean>}
 */
export async function hasAdminRole(userId, requiredRoles = []) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  const { accessLevel } = await verifyAdminAccess(userId);
  
  if (!accessLevel) return false;
  if (roles.length === 0) return true;
  
  return roles.includes(accessLevel);
}
