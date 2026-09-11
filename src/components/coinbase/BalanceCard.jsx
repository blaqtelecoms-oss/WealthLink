import React from 'react';
import { CHAINS } from '@/lib/coinbaseConfig';
import { RefreshCw, Wallet2, Loader2 } from 'lucide-react';

export default function BalanceCard({ balances, loading, chainId, onRefresh, isConnected }) {
  const chain = CHAINS[chainId];

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
        <div className="flex items-center gap-2">
          <Wallet2 className="h-4 w-4 text-[#d4af37]" />
          <h2 className="text-sm font-semibold text-white">Wallet balance</h2>
        </div>
        <p className="mt-3 text-sm text-slate-500">Connect your wallet to view your live on-chain balance.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet2 className="h-4 w-4 text-[#d4af37]" />
          <h2 className="text-sm font-semibold text-white">Wallet balance</h2>
          {chain && <span className="text-xs text-slate-500">· {chain.name}</span>}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <BalanceTile label="ETH" value={balances?.ETH} loading={loading} />
        <BalanceTile label="USDC" value={balances?.USDC} loading={loading} />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Balances are read live from the blockchain for the connected wallet on {chain?.name || 'this network'}.
      </p>
    </div>
  );
}

function BalanceTile({ label, value, loading }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#07101d] p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      {loading && value == null ? (
        <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-white/10" />
      ) : (
        <p className="mt-1 font-mono text-lg font-semibold text-white">
          {value == null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: label === 'USDC' ? 2 : 6 })}
        </p>
      )}
    </div>
  );
}