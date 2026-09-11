export const PERIOD_OPTIONS = [14, 30, 45, 60, 90];

export const COMMISSION_RATE = 0.03;

export const INVESTMENT_PLANS = [
  { id: 'starter', name: 'Starter', minAmount: 35, periods: [14] },
  { id: 'basic', name: 'Basic', minAmount: 100, periods: [30, 45, 60, 90] },
  { id: 'standard', name: 'Standard', minAmount: 300, periods: [30, 45, 60, 90] },
  { id: 'advanced', name: 'Advanced', minAmount: 700, periods: [30, 45, 60, 90] },
  { id: 'premium', name: 'Premium', minAmount: 1000, periods: [30, 45, 60, 90] },
];

export function getPlanForAmount(amount) {
  return INVESTMENT_PLANS.find(p => amount >= p.minAmount);
}

export function projectedValue(amount, periodDays, dailyRate) {
  return amount * (1 + dailyRate * periodDays);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}