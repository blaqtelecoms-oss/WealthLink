import React, { useState } from 'react';
import { Leaf, Star, TrendingUp, Diamond, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAILY_RATE = 0.015;
const PERIODS = [14, 30, 45, 60, 90];
const PLANS = [
  { name: 'Starter', icon: Leaf, min: 35 },
  { name: 'Basic', icon: Star, min: 100 },
  { name: 'Standard', icon: TrendingUp, min: 300 },
  { name: 'Advanced', icon: Diamond, min: 700 },
  { name: 'Premium', icon: Crown, min: 1000 },
];

function grow(principal, days) {
  return principal * Math.pow(1 + DAILY_RATE, days);
}

function formatUsd(v) {
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatZar(v, rate) {
  if (!rate) return '—';
  return 'R ' + (v * rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PlanSelector({ zarRate, canInvest, kycBlocked, onSelect }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [amount, setAmount] = useState('');

  const amt = parseFloat(amount) || 0;
  const valid = selectedPlan && selectedPeriod && amt >= selectedPlan.min;
  const projection = valid ? grow(amt, selectedPeriod) : 0;

  const handlePlanClick = (plan) => {
    setSelectedPlan(plan);
    setAmount(String(plan.min));
    if (plan.name !== 'Starter' && selectedPeriod === 14) {
      setSelectedPeriod(null);
    }
  };

  const handleContinue = () => {
    if (valid) {
      onSelect({ plan: selectedPlan, period: selectedPeriod, amount: amt });
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1525] overflow-hidden">
      <div className="bg-[#1c2530] px-5 py-3 border-b border-white/10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4af37]">Investment Plans — 1.5% Daily Growth</h2>
      </div>

      {/* Plan cards */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan?.name === plan.name;
          return (
            <button
              key={plan.name}
              type="button"
              disabled={!canInvest || kycBlocked}
              onClick={() => handlePlanClick(plan)}
              className={`rounded-xl border p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-[#c5a059] bg-[#c5a059]/10'
                  : 'border-white/10 bg-white/[.02] hover:border-white/20'
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 mb-3">
                <Icon className="h-4 w-4 text-[#d4af37]" />
              </div>
              <p className="font-semibold text-white text-sm">{plan.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">Min {formatUsd(plan.min)}</p>
              <p className="text-xs text-[#c5a059]/80 mt-0.5">≈ {formatZar(plan.min, zarRate)}</p>
            </button>
          );
        })}
      </div>

      {/* Period selection */}
      {selectedPlan && (
        <div className="px-5 pb-5">
          <label className="text-sm font-medium mb-2 block text-slate-300">Select period</label>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((days) => {
              const allowed = days !== 14 || selectedPlan.name === 'Starter';
              const isSelected = selectedPeriod === days;
              return (
                <button
                  key={days}
                  type="button"
                  disabled={!allowed}
                  onClick={() => setSelectedPeriod(days)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-[#c5a059] text-[#0a0e14]'
                      : 'bg-white/[.03] text-slate-400 hover:bg-white/[.06]'
                  }`}
                >
                  {`${days} Days`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Amount input + projection */}
      {selectedPlan && selectedPeriod && (
        <div className="px-5 pb-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block text-slate-300">
              Investment amount (USD)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${formatUsd(selectedPlan.min)}`}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[.03] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
            />
            {amt > 0 && amt < selectedPlan.min && (
              <p className="mt-1.5 text-xs text-rose-300">
                Minimum is {formatUsd(selectedPlan.min)} (≈ {formatZar(selectedPlan.min, zarRate)})
              </p>
            )}
          </div>

          {valid && (
            <div className="rounded-lg border border-[#c5a059]/20 bg-[#c5a059]/[.06] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Est. maturity value</span>
                <span className="font-semibold text-[#d4af37]">{formatUsd(projection)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-slate-400">≈ ZAR</span>
                <span className="font-semibold text-white">{formatZar(projection, zarRate)}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!valid}
            className="w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]"
            size="lg"
          >
            Continue to Payment
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}