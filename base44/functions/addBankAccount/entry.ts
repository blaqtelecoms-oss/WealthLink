import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function fingerprint(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const accountNumber = String(body.account_number || '').replace(/\D/g, '');
    if (!body.bank_name || !body.account_holder || accountNumber.length < 6 || !body.branch_code) return Response.json({ error: 'Complete all bank account fields' }, { status: 400 });
    const accountFingerprint = await fingerprint(`${String(body.bank_name).toUpperCase()}|${accountNumber}`);
    const duplicates = await base44.asServiceRole.entities.BankAccount.filter({ account_fingerprint: accountFingerprint });
    if (duplicates.length) {
      await base44.asServiceRole.entities.ComplianceFlag.create({ flag_id: `CF-${Date.now()}`, member_id: user.id, category: 'DUPLICATE_ACCOUNT', severity: 'HIGH', status: 'FLAGGED_FOR_REVIEW', reason: 'A bank-account fingerprint matches an existing record and requires authorized review.', related_entity: 'BankAccount', related_entity_id: duplicates[0].id });
      return Response.json({ error: 'This bank account is already registered and has been flagged for authorized review' }, { status: 409 });
    }
    const masked = `•••• ${accountNumber.slice(-4)}`;
    const account = await base44.asServiceRole.entities.BankAccount.create({ member_id: user.id, bank_name: String(body.bank_name).trim(), account_holder: String(body.account_holder).trim(), account_number_masked: masked, account_fingerprint: accountFingerprint, account_type: String(body.account_type || 'Cheque'), branch_code: String(body.branch_code).trim(), is_verified: false, status: 'PENDING_VERIFICATION' });
    await base44.asServiceRole.entities.AuditLog.create({ user_id: user.id, user_role: user.app_role || user.role, action: 'BANK_ACCOUNT_ADDED', entity: 'BankAccount', entity_id: account.id, previous_value: '', new_value: JSON.stringify({ bank: account.bank_name, masked }), reason: 'Member bank account addition', timestamp: new Date().toISOString() });
    return Response.json({ account });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}