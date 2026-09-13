import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminAccess, canAccessRoute } from './adminAccess.js';

test('admin access is granted for a current admin user', () => {
  const result = getAdminAccess({ is_admin: true, is_super_admin: false, app_role: 'ADMIN' });
  assert.equal(result.isAdmin, true);
  assert.equal(result.isSuperAdmin, false);
  assert.equal(result.accessLevel, 'ADMIN');
});

test('super admin access is granted for a privileged user', () => {
  const result = getAdminAccess({ is_admin: true, is_super_admin: true, app_role: 'SUPER_ADMIN' });
  assert.equal(result.isAdmin, true);
  assert.equal(result.isSuperAdmin, true);
  assert.equal(result.accessLevel, 'SUPER_ADMIN');
});

test('admin role access works even without the legacy is_admin flag', () => {
  const result = canAccessRoute({ app_role: 'FINANCE_ADMIN', is_admin: false }, ['SUPPORT', 'FINANCE_ADMIN', 'ADMIN']);
  assert.equal(result, true);
});

test('non-admin users are rejected', () => {
  const result = getAdminAccess({ is_admin: false, is_super_admin: false, app_role: 'MEMBER' });
  assert.equal(result.isAdmin, false);
  assert.equal(result.isSuperAdmin, false);
  assert.equal(result.accessLevel, 'MEMBER');
});
