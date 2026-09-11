import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const amount = money(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'Enter a valid withdrawal amount' }, { status: 400 });
    const configs = await base44.asServiceRole.entities.IncentiveConfiguration.list('-updated_date', 1);
    const config = configs[0];
    if (config?.kyc_required_for_withdrawal && user.kyc_status !== 'VERIFIED') return Response.json({ error: 'Verified KYC is required before withdrawal' }, { status: 403 });
    const bankId = String(body.bankAccountId || '');
    const banks = bankId ? await base44.asServiceRole.entities.BankAccount.filter({ id: bankId }) : [];
    const bank = banks[0];
    if (!bank || bank.member_id !== user.id) return Response.json({ error: 'Bank account is invalid' }, { status: 400 });
    if (config?.bank_verification_required && !bank.is_verified) return Response.json({ error: 'A verified bank account is required' }, { status: 403 });
    const ledger = await base44.asServiceRole.entities.WalletTransaction.filter({ member_id: user.id, balance_type: 'AVAILABLE_REWARD', status: 'POSTED' });
    const available = money(ledger.reduce((sum, item) => sum + (item.type === 'CREDIT' || item.type === 'RELEASE' ? Number(item.amount) : -Number(item.amount)), 0));
    const open = await base44.asServiceRole.entities.Withdrawal.filter({ member_id: user.id, status: { $in: ['REQUESTED','UNDER_REVIEW','APPROVED','PROCESSING'] } });
    const reserved = money(open.reduce((sum, item) => sum + Number(item.amount), 0));
    if (amount > money(available - reserved)) return Response.json({ error: 'Withdrawal exceeds the available reward balance' }, { status: 400 });
    const withdrawal = await base44.asServiceRole.entities.Withdrawal.create({ withdrawal_id: `WD-${Date.now()}`, member_id: user.id, amount, bank_account_id: bank.id, bank_account_masked: bank.account_number_masked, status: 'REQUESTED', requested_date: new Date().toISOString() });
    await base44.asServiceRole.entities.WalletTransaction.create({ transaction_id: `WT-${Date.now()}`, member_id: user.id, amount, balance_type: 'AVAILABLE_REWARD', type: 'HOLD', description: 'Withdrawal request hold', source: 'WITHDRAWAL', source_id: withdrawal.id, status: 'PENDING', timestamp: new Date().toISOString() });
    await base44.asServiceRole.entities.AuditLog.create({ user_id: user.id, user_role: user.app_role || user.role, action: 'WITHDRAWAL_REQUESTED', entity: 'Withdrawal', entity_id: withdrawal.id, previous_value: '', new_value: JSON.stringify({ amount, bank: bank.account_number_masked }), reason: 'Member withdrawal request', timestamp: new Date().toISOString() });
    return Response.json({ withdrawal });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}