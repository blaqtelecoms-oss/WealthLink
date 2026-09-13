export const ADMIN_ROLE_VALUES = new Set([
  'ADMIN',
  'SUPER_ADMIN',
  'READ_ONLY_ADMIN',
  'FINANCE_ADMIN',
  'COMPLIANCE_OFFICER',
  'SUPPORT',
]);

export function getAdminAccess({
  app_role,
  access_level,
  is_admin,
  is_super_admin,
}) {
  const role = String(app_role || access_level || 'MEMBER').toUpperCase();
  const adminFlag = Boolean(is_admin);
  const superAdminFlag = Boolean(is_super_admin);

  const effectiveAccessLevel = superAdminFlag
    ? 'SUPER_ADMIN'
    : adminFlag || ADMIN_ROLE_VALUES.has(role)
      ? (role === 'READ_ONLY_ADMIN' ? 'READ_ONLY_ADMIN' : role || 'ADMIN')
      : role;

  return {
    isAdmin: adminFlag || ADMIN_ROLE_VALUES.has(effectiveAccessLevel),
    isSuperAdmin: superAdminFlag || effectiveAccessLevel === 'SUPER_ADMIN',
    accessLevel: effectiveAccessLevel,
  };
}

export function canAccessRoute(user, roles = [], requireSuperAdmin = false) {
  if (!user) return false;

  const normalizedRoles = (roles || []).map((role) => String(role).toUpperCase());
  const userRole = String(user.app_role || user.access_level || user.role || 'MEMBER').toUpperCase();
  const adminAccess = getAdminAccess({
    app_role: user.app_role || user.access_level || user.role,
    access_level: user.access_level,
    is_admin: user.is_admin,
    is_super_admin: user.is_super_admin,
  });

  const hasRequiredPrivilege = Boolean(
    adminAccess.isAdmin &&
    (!requireSuperAdmin || adminAccess.isSuperAdmin) &&
    (
      normalizedRoles.includes(userRole) ||
      normalizedRoles.some((role) => ADMIN_ROLE_VALUES.has(role) && adminAccess.isAdmin)
    )
  );

  return hasRequiredPrivilege;
}
