import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateUniqueReferralCode } from '../../shared/referralCode.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.referral_code) return Response.json({ referralCode: user.referral_code });
    const uniqueCode = await generateUniqueReferralCode(base44);
    await base44.asServiceRole.entities.User.update(user.id, { referral_code: uniqueCode });
    return Response.json({ referralCode: uniqueCode });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}