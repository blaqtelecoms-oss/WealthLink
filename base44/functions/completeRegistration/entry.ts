import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateUniqueReferralCode } from '../../shared/referralCode.ts';
import { sendEmail, welcomeTemplate, referralLinkedTemplate } from '../../shared/emailTemplates.ts';

const clean = (value) => String(value || '').trim();

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const fullName = clean(body.fullName);
    const mobile = clean(body.mobileNumber).replace(/\s/g, '');
    const country = clean(body.country);
    const dateOfBirth = clean(body.dateOfBirth);
    const referralCode = clean(body.referralCode).toUpperCase();
    if (!fullName || !mobile || !country || !dateOfBirth) return Response.json({ error: 'All member details are required' }, { status: 400 });
    const duplicatePhones = await base44.asServiceRole.entities.User.filter({ mobile_number: mobile });
    if (duplicatePhones.some((item) => item.id !== user.id)) return Response.json({ error: 'This mobile number is already registered' }, { status: 409 });
    let referrer = null;
    if (referralCode) {
      const matches = await base44.asServiceRole.entities.User.filter({ referral_code: referralCode });
      referrer = matches[0] || null;
      if (!referrer) return Response.json({ error: 'Referral code was not found' }, { status: 400 });
      if (referrer.id === user.id || referrer.email === user.email) return Response.json({ error: 'Self-referrals are not permitted' }, { status: 400 });
    }
    const memberNumber = `WL-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-7)}`;
    const existingCode = user.referral_code ? String(user.referral_code).trim() : '';
    const uniqueCode = existingCode || await generateUniqueReferralCode(base44);
    await base44.asServiceRole.entities.User.update(user.id, { full_name: fullName, mobile_number: mobile, country, date_of_birth: dateOfBirth, member_number: memberNumber, referral_code: uniqueCode, referred_by_member_id: referrer?.id || '', app_role: 'MEMBER', member_status: 'ACTIVE', kyc_status: 'PENDING', leadership_level: 0 });
    if (referrer) await base44.asServiceRole.entities.ReferralRelationship.create({ referrer_user_id: referrer.id, referred_user_id: user.id, referrer_member_number: referrer.member_number, referred_member_number: memberNumber, level: 1, is_qualified: false, relationship_date: new Date().toISOString() });
    await base44.asServiceRole.entities.Notification.create({ member_id: user.id, type: 'REGISTRATION', title: 'Welcome to WealthLink', message: 'Your member profile has been created. Complete KYC before using controlled financial features.', timestamp: new Date().toISOString() });
    await base44.asServiceRole.entities.AuditLog.create({ user_id: user.id, user_role: 'MEMBER', action: 'MEMBER_REGISTERED', entity: 'User', entity_id: user.id, previous_value: '', new_value: JSON.stringify({ memberNumber, referralCode: uniqueCode }), reason: 'Member registration', timestamp: new Date().toISOString() });

    // Welcome email to the new member; referral-linked email to their referrer.
    const welcome = welcomeTemplate(fullName);
    await sendEmail(base44, user.email, welcome.subject, welcome.html);
    if (referrer) {
      const linked = referralLinkedTemplate(referrer.full_name || referrer.email || 'partner', fullName);
      await sendEmail(base44, referrer.email, linked.subject, linked.html);
    }

    return Response.json({ memberNumber, referralCode: uniqueCode });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}