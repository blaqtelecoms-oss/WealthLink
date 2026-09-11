import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const reference = () => `INV-${Date.now()}`;

const PLANS = {
  'Starter': 35,
  'Basic': 100,
  'Standard': 300,
  'Advanced': 700,
  'Premium': 1000,
};
const VALID_PERIODS = [1, 14, 30, 45, 60, 90];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const amount = money(body.amount);
    const planName = String(body.planName || '').trim();
    const periodDays = parseInt(body.periodDays, 10);
    const suppliedRef = String(body.transactionReference || '').trim();

    // Validate plan
    const minAmount = PLANS[planName];
    if (minAmount === undefined) return Response.json({ error: 'Invalid investment plan' }, { status: 400 });
    if (!Number.isFinite(amount) || amount < minAmount) return Response.json({ error: `Minimum investment for ${planName} is $${minAmount}` }, { status: 400 });

    // Validate period
    if (!VALID_PERIODS.includes(periodDays)) return Response.json({ error: 'Invalid investment period' }, { status: 400 });
    if (periodDays === 14 && planName !== 'Starter') return Response.json({ error: '14-day period is only available for the Starter plan' }, { status: 400 });

    // KYC check
    const configs = await base44.asServiceRole.entities.IncentiveConfiguration.list('-updated_date', 1);
    const config = configs[0];
    if (config?.kyc_required_for_investment && user.kyc_status !== 'VERIFIED') return Response.json({ error: 'Verified KYC is required before investing' }, { status: 403 });

    // Transaction reference
    if (!suppliedRef) return Response.json({ error: 'Transaction reference is required' }, { status: 400 });
    if ((await base44.asServiceRole.entities.Investment.filter({ transaction_reference: suppliedRef })).length) return Response.json({ error: 'Transaction reference has already been used' }, { status: 409 });

    // Exchange rate (USD → ZAR)
    const rates = await base44.asServiceRole.entities.ExchangeRate.filter({ base_currency: 'USD', quote_currency: 'ZAR', is_active: true }, '-effective_date', 1);
    if (!rates[0]) return Response.json({ error: 'No active exchange rate is configured' }, { status: 400 });
    const exchangeRate = Number(rates[0].rate);
    const zarEquivalent = money(amount * exchangeRate);

    // Dates
    const now = new Date();
    const maturity = new Date(now);
    maturity.setDate(maturity.getDate() + periodDays);

    const investmentId = reference();
    const investment = await base44.asServiceRole.entities.Investment.create({
      investment_id: investmentId,
      member_id: user.id,
      product_id: planName,
      product_name: planName,
      investment_amount: amount,
      currency: 'USD',
      exchange_rate: exchangeRate,
      zar_equivalent: zarEquivalent,
      transaction_reference: suppliedRef,
      payment_status: 'PENDING',
      investment_status: 'ACTIVE',
      start_date: now.toISOString().split('T')[0],
      maturity_date: maturity.toISOString().split('T')[0],
    });

    await base44.asServiceRole.entities.WalletTransaction.create({
      transaction_id: `WT-${Date.now()}`,
      member_id: user.id,
      amount: zarEquivalent,
      balance_type: 'INVESTMENT',
      type: 'CREDIT',
      description: `Investment in ${planName} (${periodDays} days)`,
      source: 'INVESTMENT',
      source_id: investment.id,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_role: user.app_role || user.role,
      action: 'INVESTMENT_CREATED',
      entity: 'Investment',
      entity_id: investment.id,
      previous_value: '',
      new_value: JSON.stringify({ planName, amount, periodDays, exchangeRate, zarEquivalent }),
      reason: 'Member investment instruction',
      timestamp: new Date().toISOString(),
    });

    return Response.json({ investment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}