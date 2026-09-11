import React from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Loader2 } from 'lucide-react';

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatAmount(v) {
  if (!Number.isFinite(v)) return '0';
  return Math.abs(v).toLocaleString('en-ZA', { maximumFractionDigits: 8 });
}

export default function LunoExchangeTransactions({ transactions, loading }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-[#d4af37]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent Luno transactions</h3>
      </div>
      {loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No on-exchange transactions.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx, i) => {
            const positive = tx.amount >= 0;
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#07101d] p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${positive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                  {positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200">{tx.kind}</p>
                  <p className="truncate text-[11px] text-slate-500">{tx.description || tx.asset}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-mono text-sm font-semibold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {positive ? '+' : '−'}{formatAmount(tx.amount)} {tx.asset}
                  </p>
                  <p className="text-[10px] text-slate-500">{relativeTime(tx.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}