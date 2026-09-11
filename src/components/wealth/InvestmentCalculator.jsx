import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

const DAILY_RATE = 0.015;
const PERIODS = [14, 30, 45, 60, 90];

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

export default function InvestmentCalculator({ zarRate }) {
  const [amount, setAmount] = useState(100);

  const principal = Math.max(0, parseFloat(amount) || 0);
  const daily = principal * DAILY_RATE;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-4 w-4 text-[#d4af37]" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4af37]">Investment Calculator</h2>
      </div>
      <div className="mb-5">
        <label className="text-sm font-medium text-slate-300 mb-1.5 block">Investment amount (USD)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          className="w-full px-3 py-2.5 rounded-lg bg-white/[.03] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Daily growth: <span className="text-[#d4af37] font-semibold">{formatUsd(daily)}</span> / day
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PERIODS.map((days) => {
          const val = grow(principal, days);
          const profit = val - principal;
          return (
            <div key={days} className="rounded-xl border border-[#d4af37]/20 bg-[#07101d] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{days} Days</p>
              <p className="mt-1 font-semibold text-white text-sm">{formatUsd(val)}</p>
              <p className="text-xs text-slate-500">{formatZar(val, zarRate)}</p>
              <p className="mt-1 text-[10px] text-emerald-400">+{formatUsd(profit)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}