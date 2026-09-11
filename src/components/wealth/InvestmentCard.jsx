import React from 'react';
import StatusPill from '@/components/wealth/StatusPill';
import { format } from 'date-fns';
import { formatCurrency, projectedValue } from '@/lib/simulation';

export default function InvestmentCard({ investment, onClose }) {
  const { amount, period_days, start_date, end_date, status, daily_rate, label } = investment;

  const now = new Date();
  const start = new Date(start_date);
  const end = new Date(end_date);
  const totalMs = end - start;
  const isMatured = now >= end;
  const isActive = status === 'active' && !isMatured;
  const elapsedMs = status === 'closed' || isMatured ? totalMs : Math.min(Math.max(now - start, 0), totalMs);
  const progress = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 100;
  const elapsedDays = Math.floor(elapsedMs / 86400000);
  const daysLeft = Math.max(period_days - elapsedDays, 0);

  const currentValue = projectedValue(amount, Math.min(elapsedDays, period_days), daily_rate);
  const maturityValue = projectedValue(amount, period_days, daily_rate);
  const pillValue = status === 'closed' ? 'CLOSED' : isMatured ? 'MATURED' : 'ACTIVE';

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-white font-medium truncate">{label}</h3>
        <StatusPill value={pillValue} />
      </div>

      {/* Centered amount */}
      <p className="mt-4 text-center text-3xl font-bold text-white">{formatCurrency(amount)}</p>

      {/* Progress */}
      <div className="mt-5">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-[#d4af37] transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      {/* Data grid */}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-xs text-slate-500">Started</p>
          <p className="text-sm font-medium text-slate-200">{format(start, 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Matures</p>
          <p className="text-sm font-medium text-slate-200">{format(end, 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Days left</p>
          <p className="text-sm font-medium text-slate-200">{isActive ? `${daysLeft} days` : '0 days'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Current value</p>
          <p className="text-sm font-semibold text-[#d4af37]">{formatCurrency(currentValue)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Est. maturity</p>
          <p className="text-sm font-semibold text-[#d4af37]">{formatCurrency(maturityValue)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Period</p>
          <p className="text-sm font-medium text-slate-200">{period_days} days</p>
        </div>
      </div>

      {/* Close button */}
      {isActive && (
        <button
          onClick={() => onClose(investment)}
          className="mt-5 w-full py-2 rounded-lg text-xs font-medium text-slate-400 border border-white/10 hover:text-rose-300 hover:border-rose-400/20 transition-colors"
        >
          Close investment
        </button>
      )}
    </div>
  );
}