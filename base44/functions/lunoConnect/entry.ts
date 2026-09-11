import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { lunoRequest } from "../../shared/lunoClient.ts";
import { encryptSecret } from "../../shared/lunoCrypto.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const keyId = String(body.api_key_id || '').trim();
    const keySecret = String(body.api_secret || '').trim();
    if (!keyId || !keySecret) return Response.json({ error: 'API Key ID and Secret are required' }, { status: 400 });

    try {
      await lunoRequest("/api/1/balance", { keyId, keySecret });
    } catch (e) {
      return Response.json({ error: 'Invalid Luno credentials: ' + (e.message || 'verification failed') }, { status: 400 });
    }

    const encrypted = await encryptSecret(keySecret);
    const existing = await base44.asServiceRole.entities.LunoConnection.filter({ member_id: user.id });
    const payload = {
      member_id: user.id,
      status: "CONNECTED",
      api_key_id: keyId,
      api_secret_encrypted: encrypted,
      connected_date: new Date().toISOString(),
      disconnected_date: null,
      error_message: null,
    };
    let connection;
    if (existing.length) {
      connection = await base44.asServiceRole.entities.LunoConnection.update(existing[0].id, payload);
    } else {
      connection = await base44.asServiceRole.entities.LunoConnection.create(payload);
    }
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_role: user.app_role || user.role,
      action: 'LUNO_CONNECTED',
      entity: 'LunoConnection',
      entity_id: connection.id,
      previous_value: '',
      new_value: 'connected',
      reason: 'Member connected Luno account',
      timestamp: new Date().toISOString(),
    });
    return Response.json({ connection: { id: connection.id, status: 'CONNECTED', api_key_id: keyId } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}