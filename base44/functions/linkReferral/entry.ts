import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendEmail, referralLinkedTemplate } from '../../shared/emailTemplates.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const rawInput = String(body.referralLink || '').trim();

    if (!rawInput) return Response.json({ error: 'Referral link is required' }, { status: 400 });

    // Extract referral code from a full link or accept a bare code
    let referralCode = rawInput;
    try {
      const url = new URL(rawInput);
      referralCode = url.searchParams.get('ref') || rawInput;
    } catch (_) { /* not a URL — treat as bare code */ }
    referralCode = referralCode.trim().toUpperCase();

    if (!referralCode) return Response.json({ error: 'Could not find a referral code in that link' }, { status: 400 });

    // Already linked?
    if (user.referred_by_member_id) return Response.json({ error: 'You are already linked to a referrer' }, { status: 409 });

    // Find referrer
    const matches = await base44.asServiceRole.entities.User.filter({ referral_code: referralCode });
    const referrer = matches[0] || null;
    if (!referrer) return Response.json({ error: 'Referral code was not found' }, { status: 400 });
    if (referrer.id === user.id) return Response.json({ error: 'Self-referrals are not permitted' }, { status: 400 });

    // Check for existing relationship
    const existing = await base44.asServiceRole.entities.ReferralRelationship.filter({ referred_user_id: user.id });
    if (existing.length > 0) return Response.json({ error: 'You are already linked to a referrer' }, { status: 409 });

    // Link the user
    await base44.asServiceRole.entities.User.update(user.id, { referred_by_member_id: referrer.id });
    await base44.asServiceRole.entities.ReferralRelationship.create({
      referrer_user_id: referrer.id,
      referred_user_id: user.id,
      referrer_member_number: referrer.member_number || '',
      referred_member_number: user.member_number || '',
      level: 1,
      is_qualified: false,
      relationship_date: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_role: user.app_role || 'MEMBER',
      action: 'REFERRAL_LINKED',
      entity: 'ReferralRelationship',
      entity_id: referrer.id,
      previous_value: '',
      new_value: referralCode,
      reason: 'Member linked via referral link during onboarding',
      timestamp: new Date().toISOString(),
    });

    // Notify the referrer that someone joined using their code.
    const linked = referralLinkedTemplate(referrer.full_name || referrer.email || 'partner', user.full_name || 'a new member');
    await sendEmail(base44, referrer.email, linked.subject, linked.html);

    return Response.json({ success: true, referrerName: referrer.full_name || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}