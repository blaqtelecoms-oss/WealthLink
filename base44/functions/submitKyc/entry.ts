import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function fingerprint(value) {
  const bytes = new TextEncoder().encode(value.toUpperCase().replace(/\s/g, ''));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const validTypes = ['IDENTITY','PROOF_OF_ADDRESS','BANK_CONFIRMATION'];
    if (!validTypes.includes(body.documentType) || !String(body.documentUri || '').startsWith('private://')) return Response.json({ error: 'A valid private document upload is required' }, { status: 400 });
    let identityFingerprint = '';
    if (body.documentType === 'IDENTITY') {
      if (String(body.identityReference || '').trim().length < 5) return Response.json({ error: 'Identity reference is required for duplicate controls' }, { status: 400 });
      identityFingerprint = await fingerprint(String(body.identityReference));
      const duplicates = await base44.asServiceRole.entities.KYCSubmission.filter({ identity_fingerprint: identityFingerprint });
      if (duplicates.some((item) => item.member_id !== user.id)) {
        await base44.asServiceRole.entities.ComplianceFlag.create({ flag_id: `CF-${Date.now()}`, member_id: user.id, category: 'DUPLICATE_ACCOUNT', severity: 'HIGH', status: 'FLAGGED_FOR_REVIEW', reason: 'An identity fingerprint matches another member record and requires authorized review.', related_entity: 'KYCSubmission', related_entity_id: duplicates[0].id });
        return Response.json({ error: 'Identity details require authorized compliance review' }, { status: 409 });
      }
    }
    const submission = await base44.asServiceRole.entities.KYCSubmission.create({ member_id: user.id, document_type: body.documentType, document_uri: body.documentUri, identity_fingerprint: identityFingerprint, status: 'PENDING' });
    await base44.asServiceRole.entities.Notification.create({ member_id: user.id, type: 'KYC_STATUS', title: 'KYC submitted', message: 'Your document is pending authorized compliance review.', timestamp: new Date().toISOString() });
    await base44.asServiceRole.entities.AuditLog.create({ user_id: user.id, user_role: user.app_role || user.role, action: 'KYC_SUBMITTED', entity: 'KYCSubmission', entity_id: submission.id, previous_value: '', new_value: JSON.stringify({ documentType: body.documentType, status: 'PENDING' }), reason: 'Member KYC submission', timestamp: new Date().toISOString() });
    return Response.json({ submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}