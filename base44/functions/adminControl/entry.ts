import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmail, rewardCreditedTemplate, withdrawalPaidTemplate } from '../../shared/emailTemplates.ts';

const allowedRoles = ['ADMIN','SUPER_ADMIN','FINANCE_ADMIN','COMPLIANCE_OFFICER'];
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !allowedRoles.includes(user.app_role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    let entity = '', entityId = '', previous = null, next = null;
    if (body.action === 'SAVE_CONFIG' && (user.role === 'admin' || ['ADMIN','SUPER_ADMIN'].includes(user.app_role))) {
      const payload = body.config || {};
      if (payload.direct_percentage < 0 || payload.direct_percentage > 100 || payload.leadership_percentage < 0 || payload.leadership_percentage > 100 || payload.maximum_leadership_levels < 0 || payload.maximum_leadership_levels > 5) return Response.json({ error: 'Configuration values are outside permitted limits' }, { status: 400 });
      const records = await base44.asServiceRole.entities.IncentiveConfiguration.list('-updated_date', 1);
      previous = records[0] || null;
      next = previous ? await base44.asServiceRole.entities.IncentiveConfiguration.update(previous.id, payload) : await base44.asServiceRole.entities.IncentiveConfiguration.create(payload);
      entity = 'IncentiveConfiguration'; entityId = next.id;
    } else if (body.action === 'REVIEW_WITHDRAWAL' && (user.role === 'admin' || ['FINANCE_ADMIN','ADMIN','SUPER_ADMIN'].includes(user.app_role))) {
      const record = await base44.asServiceRole.entities.Withdrawal.get(body.id);
      if (!record) return Response.json({ error: 'Withdrawal not found' }, { status: 404 });
      const valid = ['UNDER_REVIEW','APPROVED','PROCESSING','PAID','REJECTED','CANCELLED'];
      if (!valid.includes(body.status)) return Response.json({ error: 'Invalid withdrawal status' }, { status: 400 });
      previous = record; const dates = body.status === 'APPROVED' ? { approved_date: new Date().toISOString() } : body.status === 'PAID' ? { payment_date: new Date().toISOString(), payment_reference: String(body.paymentReference || '') } : {};
      next = await base44.asServiceRole.entities.Withdrawal.update(record.id, { status: body.status, ...dates }); entity = 'Withdrawal'; entityId = record.id;
      if (body.status === 'PAID') {
        try {
          const member = await base44.asServiceRole.entities.User.get(record.member_id);
          if (member?.email) {
            const tpl = withdrawalPaidTemplate(member.full_name || member.email, Number(record.amount), String(body.paymentReference || ''));
            await sendEmail(base44, member.email, tpl.subject, tpl.html);
          }
        } catch (_) { /* email failure must not block withdrawal update */ }
      }
    } else if (body.action === 'REVIEW_KYC' && (user.role === 'admin' || ['COMPLIANCE_OFFICER','ADMIN','SUPER_ADMIN'].includes(user.app_role))) {
      const record = await base44.asServiceRole.entities.KYCSubmission.get(body.id);
      if (!record) return Response.json({ error: 'KYC submission not found' }, { status: 404 });
      const valid = ['UNDER_REVIEW','VERIFIED','REJECTED','EXPIRED'];
      if (!valid.includes(body.status)) return Response.json({ error: 'Invalid KYC status' }, { status: 400 });
      previous = record; next = await base44.asServiceRole.entities.KYCSubmission.update(record.id, { status: body.status, review_notes: String(body.reason || ''), reviewed_by: user.id, reviewed_date: new Date().toISOString() });
      await base44.asServiceRole.entities.User.update(record.member_id, { kyc_status: body.status }); entity = 'KYCSubmission'; entityId = record.id;
    } else if (body.action === 'REVIEW_INVESTMENT' && (user.role === 'admin' || ['FINANCE_ADMIN','ADMIN','SUPER_ADMIN'].includes(user.app_role))) {
      const record = await base44.asServiceRole.entities.Investment.get(body.id);
      const valid = ['PAYMENT_RECEIVED','ACTIVE','MATURED','CANCELLED','REFUNDED','REVERSED'];
      if (!record || !valid.includes(body.status)) return Response.json({ error: 'Investment review is invalid' }, { status: 400 });
      previous = record;
      const dateFields = body.status === 'ACTIVE' ? { start_date: new Date().toISOString().slice(0, 10), payment_status: 'RECEIVED' } : ['REFUNDED','REVERSED'].includes(body.status) ? { payment_status: 'REFUNDED' } : {};
      next = await base44.asServiceRole.entities.Investment.update(record.id, { investment_status: body.status, ...dateFields });
      const existingIncentives = await base44.asServiceRole.entities.Incentive.filter({ investment_id: record.investment_id });
      if (body.status === 'ACTIVE' && !existingIncentives.length) {
        const configs = await base44.asServiceRole.entities.IncentiveConfiguration.list('-updated_date', 1);
        const config = configs[0];
        if (config?.programme_enabled && Number(record.zar_equivalent) >= Number(config.minimum_qualifying_transaction || 0)) {
          const links = await base44.asServiceRole.entities.ReferralRelationship.filter({ referred_user_id: record.member_id, level: 1 });
          const direct = links[0];
          if (direct) {
            const amount = Math.round((Number(record.zar_equivalent) * Number(config.direct_percentage) / 100 + Number.EPSILON) * 100) / 100;
            const status = config.approval_required ? 'UNDER_REVIEW' : 'AVAILABLE';
            await base44.asServiceRole.entities.Incentive.create({ incentive_id: `INC-${Date.now()}-D`, member_id: direct.referrer_user_id, source_member_id: record.member_id, investment_id: record.investment_id, base_amount: Number(record.zar_equivalent), percentage: Number(config.direct_percentage), amount, incentive_type: 'DIRECT', level: 1, status, calculation_note: `${Number(record.zar_equivalent).toFixed(2)} × ${Number(config.direct_percentage).toFixed(2)}% = ${amount.toFixed(2)}` });
            await base44.asServiceRole.entities.WalletTransaction.create({ transaction_id: `WT-${Date.now()}-D`, member_id: direct.referrer_user_id, amount, balance_type: config.approval_required ? 'PENDING_REWARD' : 'AVAILABLE_REWARD', type: 'CREDIT', description: 'Direct introduction incentive', source: 'INCENTIVE', source_id: record.investment_id, status: 'POSTED', timestamp: new Date().toISOString() });
            try {
              const recipient = await base44.asServiceRole.entities.User.get(direct.referrer_user_id);
              const source = await base44.asServiceRole.entities.User.get(record.member_id);
              if (recipient?.email) {
                const tpl = rewardCreditedTemplate(recipient.full_name || recipient.email, amount, 'DIRECT', source?.member_number || '');
                await sendEmail(base44, recipient.email, tpl.subject, tpl.html);
              }
            } catch (_) { /* email failure must not block incentive creation */ }
            await base44.asServiceRole.entities.ReferralRelationship.update(direct.id, { is_qualified: true });
            const qualified = await base44.asServiceRole.entities.ReferralRelationship.filter({ referrer_user_id: direct.referrer_user_id, is_qualified: true, level: 1 });
            if (qualified.length >= Number(config.qualification_requirement)) await base44.asServiceRole.entities.User.update(direct.referrer_user_id, { app_role: 'GROWTH_PARTNER', leadership_level: 1 });
            if (Number(config.maximum_leadership_levels) >= 1 && Number(config.leadership_percentage) > 0) {
              const leaders = await base44.asServiceRole.entities.ReferralRelationship.filter({ referred_user_id: direct.referrer_user_id, level: 1 });
              if (leaders[0]) {
                const leadershipAmount = Math.round((Number(record.zar_equivalent) * Number(config.leadership_percentage) / 100 + Number.EPSILON) * 100) / 100;
                await base44.asServiceRole.entities.Incentive.create({ incentive_id: `INC-${Date.now()}-L`, member_id: leaders[0].referrer_user_id, source_member_id: record.member_id, investment_id: record.investment_id, base_amount: Number(record.zar_equivalent), percentage: Number(config.leadership_percentage), amount: leadershipAmount, incentive_type: 'LEADERSHIP', level: 1, status, calculation_note: `${Number(record.zar_equivalent).toFixed(2)} × ${Number(config.leadership_percentage).toFixed(2)}% = ${leadershipAmount.toFixed(2)}` });
                try {
                  const leader = await base44.asServiceRole.entities.User.get(leaders[0].referrer_user_id);
                  const source = await base44.asServiceRole.entities.User.get(record.member_id);
                  if (leader?.email) {
                    const tpl = rewardCreditedTemplate(leader.full_name || leader.email, leadershipAmount, 'LEADERSHIP', source?.member_number || '');
                    await sendEmail(base44, leader.email, tpl.subject, tpl.html);
                  }
                } catch (_) { /* email failure must not block incentive creation */ }
              }
            }
          }
        }
      }
      if (['CANCELLED','REFUNDED','REVERSED'].includes(body.status)) {
        for (const incentive of existingIncentives.filter((item) => !['PAID','REVERSED'].includes(item.status))) await base44.asServiceRole.entities.Incentive.update(incentive.id, { status: 'REVERSED' });
        await base44.asServiceRole.entities.ComplianceFlag.create({ flag_id: `CF-${Date.now()}`, member_id: record.member_id, category: 'REVERSED_INVESTMENT', severity: 'MEDIUM', status: 'FLAGGED_FOR_REVIEW', reason: 'An investment reversal or refund requires review of linked unpaid rewards.', related_entity: 'Investment', related_entity_id: record.id });
      }
      entity = 'Investment'; entityId = record.id;
    } else return Response.json({ error: 'Action is not permitted' }, { status: 403 });
    await base44.asServiceRole.entities.AuditLog.create({ user_id: user.id, user_role: user.app_role || user.role, action: body.action, entity, entity_id: entityId, previous_value: JSON.stringify(previous || {}), new_value: JSON.stringify(next || {}), reason: String(body.reason || 'Administrative action'), timestamp: new Date().toISOString() });
    return Response.json({ result: next });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}