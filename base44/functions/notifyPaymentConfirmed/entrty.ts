import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmail, paymentSuccessTemplate } from '../../shared/emailTemplates.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const txRef = String(body.transactionReference || '').trim();
    if (!txRef) return Response.json({ error: 'Transaction reference is required' }, { status: 400 });

    // Verify the on-chain transaction belongs to this user and is confirmed.
    const matches = await base44.asServiceRole.entities.CoinbaseTransaction.filter({ transaction_hash: txRef });
    const tx = matches[0];
    if (!tx || tx.member_id !== user.id) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (tx.status !== 'CONFIRMED') return Response.json({ error: 'Transaction is not yet confirmed' }, { status: 409 });

    // Resolve the linked investment for plan name + amount.
    const investments = await base44.asServiceRole.entities.Investment.filter({ member_id: user.id, transaction_reference: txRef });
    const investment = investments[0];

    const planName = investment?.product_name || tx.chain_name || 'WealthLink plan';
    const amountUsd = investment ? Number(investment.investment_amount) : 0;

    const tpl = paymentSuccessTemplate(user.full_name || user.email || 'there', planName, amountUsd, txRef);
    await sendEmail(base44, user.email, tpl.subject, tpl.html);

    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_role: user.app_role || user.role,
      action: 'PAYMENT_SUCCESS_EMAIL_SENT',
      entity: 'CoinbaseTransaction',
      entity_id: tx.id,
      previous_value: '',
      new_value: JSON.stringify({ to: user.email, planName, amountUsd }),
      reason: 'On-chain payment confirmation email',
      timestamp: new Date().toISOString(),
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}