import React from 'react';
import { Leaf, Star, TrendingUp, Diamond, Crown, RefreshCw } from 'lucide-react';

const DAILY_RATE = 0.015;
const PERIODS = [1, 14, 30, 45, 60, 90];
const PERIOD_LABELS = ['Daily (1.5%)', '14 Days', '30 Days', '45 Days', '60 Days', '90 Days'];

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
  return 'R' + (v * rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function InvestmentGrowthTable({ zarRate }) {
  return (
    <div className="rounded-2xl border border-[#d4af37]/30 bg-[#0a0a0a] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#d4af37]/30 bg-gradient-to-r from-[#d4af37]/10 to-transparent">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Investment Plans — 1.5% Daily Growth</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-[#d4af37]/30 text-left text-xs uppercase tracking-wider text-[#d4af37]">
              <th className="px-4 py-3 font-semibold">Plan</th>
              {PERIOD_LABELS.map((l) => (
                <th key={l} className="px-4 py-3 font-semibold text-right">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <tr key={plan.name} className="border-b border-white/5 hover:bg-white/[.02]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 shrink-0">
                        <Icon className="h-4 w-4 text-[#d4af37]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{plan.name}</p>
                        <p className="text-xs text-slate-500">Min {formatUsd(plan.min)}</p>
                      </div>
                    </div>
                  </td>
                  {PERIODS.map((days) => {
                    const allowed = days !== 14 || plan.min === 35;
                    const val = grow(plan.min, days);
                    return (
                      <td key={days} className="px-4 py-4 text-right">
                        {allowed ? (
                          <>
                            <p className={`font-semibold ${days === 1 ? 'text-[#d4af37]' : 'text-white'}`}>{formatUsd(val)}</p>
                            <p className="text-xs text-slate-500">{formatZar(val, zarRate)}</p>
                          </>
                        ) : (
                          <p className="text-slate-600">—</p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-[#d4af37]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-slate-500">
          *Approximate ZAR values at 1 USD = R{zarRate ? zarRate.toFixed(2) : '—'}. Rates may vary.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 px-4 py-2 text-xs font-semibold text-[#d4af37] w-fit">
          <RefreshCw className="h-3.5 w-3.5" /> WITHDRAW OR REINVEST ANYTIME
        </div>
      </div>
    </div>
  );
}