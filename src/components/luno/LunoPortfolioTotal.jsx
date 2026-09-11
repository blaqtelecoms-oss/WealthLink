import React from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

function formatMoney(v) {
  if (!Number.isFinite(v)) return '0.00';
  return v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LunoPortfolioTotal({ total, loading }) {
  if (loading && !total) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" />
      </div>
    );
  }
  if (!total) return null;

  return (
    <div className="rounded-2xl border border-[#c5a059]/20 bg-gradient-to-br from-[#101a30] to-[#0b1525] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#d4af37]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Portfolio value</h3>
        </div>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
          {total.asset_count} {total.asset_count === 1 ? 'asset' : 'assets'}
        </span>
      </div>
      <div className="mt-3">
        <p className="font-mono text-3xl font-semibold tracking-tight text-white">
          R {formatMoney(total.zar)}
        </p>
        <p className="mt-1 font-mono text-sm text-[#d4af37]">
          ≈ $ {formatMoney(total.usd)} USD
        </p>
      </div>
      {total.usd_zar_rate > 0 && (
        <p className="mt-2 text-[10px] text-slate-500">
          Estimated using USD/ZAR {total.usd_zar_rate.toFixed(2)} and live crypto prices
        </p>
      )}
    </div>
  );
}