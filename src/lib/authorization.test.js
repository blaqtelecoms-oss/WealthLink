import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAuthenticatedUser, requireSuperAdmin, isSuperAdmin } from './authorization.js';

const makeSupabase = (user, userRow) => ({
  auth: {
    async getUser() {
      return { data: { user }, error: null };
    },
  },
  from(table) {
    return {
      select() {
        return {
          eq() {
            return {
              maybeSingle: async () => ({
                data: userRow,
                error: null,
              }),
            };
          },
        };
      },
    };
  },
});

test('requireAuthenticatedUser rejects missing auth user', async () => {
  const client = makeSupabase(null, null);
  await assert.rejects(() => requireAuthenticatedUser(client), /Authentication required/i);
});

test('requireSuperAdmin allows active super admin from public.User', async () => {
  const client = makeSupabase({ id: 'auth-123' }, { auth_user_id: 'auth-123', app_role: 'SUPER_ADMIN', status: 'ACTIVE' });
  const user = await requireSuperAdmin(client);
  assert.equal(user.app_role, 'SUPER_ADMIN');
  assert.equal(user.status, 'ACTIVE');
});

test('isSuperAdmin returns false for inactive or missing app role', async () => {
  const inactiveClient = makeSupabase({ id: 'auth-456' }, { auth_user_id: 'auth-456', app_role: 'SUPER_ADMIN', status: 'SUSPENDED' });
  assert.equal(await isSuperAdmin(inactiveClient), false);

  const memberClient = makeSupabase({ id: 'auth-789' }, { auth_user_id: 'auth-789', app_role: 'MEMBER', status: 'ACTIVE' });
  assert.equal(await isSuperAdmin(memberClient), false);
});
