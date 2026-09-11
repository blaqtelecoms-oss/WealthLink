import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

const SUPER_PASSWORD = "WealthLink2026";
const ADMIN_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "FINANCE_ADMIN",
  "COMPLIANCE_OFFICER",
  "SUPPORT",
]);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!ADMIN_ROLES.has(user.app_role) && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { member_id, super_password } = body || {};
    if (super_password !== SUPER_PASSWORD) {
      return Response.json({ error: "Invalid super password" }, { status: 403 });
    }
    if (!member_id) return Response.json({ error: "member_id required" }, { status: 400 });

    const sr = base44.asServiceRole.entities;

    const [member, investments, walletTxns, withdrawals, kyc, banks, incentives, refOut, refIn] = await Promise.all([
      sr.User.get(member_id).catch(() => null),
      sr.Investment.filter({ member_id }, "-created_date", 50),
      sr.WalletTransaction.filter({ member_id }, "-timestamp", 50),
      sr.Withdrawal.filter({ member_id }, "-requested_date", 20),
      sr.KYCSubmission.filter({ member_id }, "-created_date", 20),
      sr.BankAccount.filter({ member_id }, "-created_date", 10),
      sr.Incentive.filter({ member_id }, "-created_date", 50),
      sr.ReferralRelationship.filter({ referrer_user_id: member_id }, "-relationship_date", 50),
      sr.ReferralRelationship.filter({ referred_user_id: member_id }, "-relationship_date", 50),
    ]);

    await sr.AuditLog.create({
      user_id: user.id,
      user_role: user.app_role || user.role,
      action: "ADMIN_VIEW_MEMBER_PORTAL",
      entity: "User",
      entity_id: member_id,
      reason: "Admin accessed member portal via super password",
      timestamp: new Date().toISOString(),
    });

    return Response.json({
      member,
      investments,
      wallet_transactions: walletTxns,
      withdrawals,
      kyc_submissions: kyc,
      bank_accounts: banks,
      incentives,
      referrals: { as_referrer: refOut, as_referred: refIn },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}