import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { lunoRequest } from "../../shared/lunoClient.ts";
import { decryptSecret } from "../../shared/lunoCrypto.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const asset = String(body.asset || '').trim().toUpperCase();
    const amount = String(body.amount || '').trim();
    const recipient = String(body.recipient || '').trim();
    if (!asset || !amount || !recipient) {
      return Response.json({ error: 'Asset, amount and recipient address are required' }, { status: 400 });
    }
    if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) {
      return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const conns = await base44.asServiceRole.entities.LunoConnection.filter({ member_id: user.id });
    const conn = conns[0];
    if (!conn || conn.status !== 'CONNECTED') {
      return Response.json({ error: 'Luno account not connected' }, { status: 400 });
    }
    const keySecret = await decryptSecret(conn.api_secret_encrypted);
    const externalId = `wl-${user.id}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const txRecord = await base44.asServiceRole.entities.LunoTransaction.create({
      member_id: user.id,
      asset,
      amount,
      recipient_address: recipient,
      transaction_reference: externalId,
      status: 'PENDING',
      timestamp,
    });

    try {
      const result = await lunoRequest("/api/1/send", {
        method: "POST",
        params: { currency: asset, amount, address: recipient, external_id: externalId },
        keyId: conn.api_key_id,
        keySecret,
      });
      const ref = result.transaction_id || result.id || externalId;
      await base44.asServiceRole.entities.LunoTransaction.update(txRecord.id, {
        status: 'CONFIRMED',
        transaction_reference: String(ref),
        confirmed_at: new Date().toISOString(),
      });
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_role: user.app_role || user.role,
        action: 'LUNO_SEND',
        entity: 'LunoTransaction',
        entity_id: txRecord.id,
        previous_value: '',
        new_value: JSON.stringify({ asset, amount, recipient }),
        reason: 'Member sent crypto via Luno',
        timestamp: new Date().toISOString(),
      });
      return Response.json({ status: 'CONFIRMED', reference: String(ref), success: true });
    } catch (sendErr) {
      await base44.asServiceRole.entities.LunoTransaction.update(txRecord.id, { status: 'FAILED' });
      return Response.json({ error: 'Luno send failed: ' + (sendErr.message || 'unknown error') }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}