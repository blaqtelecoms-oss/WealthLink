import React from 'react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/simulation';
import { truncateAddress, getExplorerUrl } from '@/lib/coinbaseConfig';
import { Clock, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

const DAILY_RATE = 0.015;

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export default function LiveInvestmentCard({ investment }) {
  const {
    product_name,
    investment_amount,
    currency,
    zar_equivalent,
    payment_status,
    investment_status,
    transaction_reference,
    start_date,
    maturity_date,
  } = investment;

  const amount = Number(investment_amount || 0);
  const isZar = currency === 'ZAR';
  const fmt = (v) => (isZar ? `R ${v.toFixed(2)}` : formatCurrency(v));

  const now = new Date();
  const hasDates = start_date && maturity_date;
  const totalDays = hasDates ? Math.max(1, daysBetween(start_date, maturity_date)) : 0;
  const elapsed = hasDates ? Math.max(0, Math.min(totalDays, daysBetween(start_date, now))) : 0;
  const daysLeft = Math.max(0, totalDays - elapsed);
  const progress = hasDates ? (elapsed / totalDays) * 100 : 0;

  const currentValue = amount * Math.pow(1 + DAILY_RATE, elapsed);
  const estMaturity = amount * Math.pow(1 + DAILY_RATE, totalDays);

  const isActive = investment_status === 'ACTIVE' || investment_status === 'PAYMENT_RECEIVED';
  const isPending = payment_status === 'PENDING';
  const isFailed = payment_status === 'FAILED';
  const isMatured = investment_status === 'MATURED';

  const chainId = 8453;
  const explorerUrl = transaction_reference ? getExplorerUrl(chainId, transaction_reference) : '';

  const badgeStyle = isMatured
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
    : isActive
    ? 'border-[#c5a059]/30 bg-[#c5a059]/10 text-[#d4af37]'
    : isPending
    ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
    : isFailed
    ? 'border-rose-400/30 bg-rose-400/10 text-rose-300'
    : 'border-white/15 bg-white/5 text-slate-300';

  const badgeLabel = isMatured ? 'Matured' : isActive ? 'Active' : isPending ? 'Pending' : isFailed ? 'Failed' : (investment_status || '—');

  const BadgeIcon = isMatured ? CheckCircle2 : isFailed ? AlertCircle : Clock;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-white">{product_name || 'Investment'}</h3>
          <p className="mt-1 text-2xl font-bold text-white">{fmt(amount)}</p>
          {zar_equivalent && !isZar && (
            <p className="mt-0.5 text-xs text-slate-500">≈ R {Number(zar_equivalent).toFixed(2)}</p>
          )}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle}`}>
          <BadgeIcon className="h-3.5 w-3.5" />
          {badgeLabel}
        </span>
      </div>

      {/* Progress */}
      {hasDates && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Progress</span>
            <span className="font-semibold text-[#d4af37]">{progress.toFixed(1)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c5a059] to-[#d4af37] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Data grid */}
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <DataRow label="Started" value={start_date ? format(new Date(start_date), 'MMM d, yyyy') : '—'} />
        <DataRow label="Matures" value={maturity_date ? format(new Date(maturity_date), 'MMM d, yyyy') : '—'} />
        <DataRow label="Days left" value={hasDates ? `${daysLeft} days` : '—'} />
        <DataRow label="Current value" value={hasDates ? fmt(currentValue) : fmt(amount)} valueClass="text-emerald-400" />
        <DataRow label="Est. maturity" value={hasDates ? fmt(estMaturity) : '—'} valueClass="text-[#d4af37]" />
        <DataRow label="Period" value={hasDates ? `${totalDays} days` : '—'} />
      </div>

      {/* Transaction reference */}
      {transaction_reference && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
          <span className="font-mono text-xs text-slate-500">{truncateAddress(transaction_reference)}</span>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#d4af37] hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}