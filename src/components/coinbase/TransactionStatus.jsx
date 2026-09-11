import React from 'react';
import { CheckCircle, XCircle, Loader2, ExternalLink, Clock } from 'lucide-react';
import { getExplorerUrl, truncateAddress } from '@/lib/coinbaseConfig';

export default function TransactionStatus({ txState, txHash, txError, chainId, recipient, amount, tokenSymbol, onReset }) {
  if (txState === 'idle') return null;

  const explorerUrl = getExplorerUrl(chainId, txHash);

  const config = {
    awaiting_approval: { icon: Loader2, color: 'text-amber-300', bg: 'border-amber-400/20 bg-amber-400/5', title: 'Awaiting wallet approval', desc: 'Approve the transaction in your wallet to continue.' },
    broadcast: { icon: Clock, color: 'text-amber-300', bg: 'border-amber-400/20 bg-amber-400/5', title: 'Transaction broadcast', desc: 'Waiting for on-chain confirmation...' },
    confirmed: { icon: CheckCircle, color: 'text-emerald-300', bg: 'border-emerald-400/20 bg-emerald-400/5', title: 'Payment confirmed', desc: 'Your transaction has been confirmed on-chain.' },
    failed: { icon: XCircle, color: 'text-rose-300', bg: 'border-rose-400/20 bg-rose-400/5', title: 'Payment failed', desc: txError || 'The transaction could not be completed.' },
  }[txState];

  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border p-6 ${config.bg}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${config.color} ${txState === 'awaiting_approval' ? 'animate-spin' : ''}`} />
        <div>
          <p className={`text-lg font-semibold ${config.color}`}>{config.title}</p>
          <p className="text-sm text-slate-400">{config.desc}</p>
        </div>
      </div>

      {txHash && (
        <div className="mt-4 space-y-2">
          <div className="rounded-lg border border-white/10 bg-[#07101d] px-3 py-2">
            <p className="text-xs text-slate-500">Transaction hash</p>
            <p className="mt-0.5 font-mono text-xs text-slate-300 break-all">{txHash}</p>
          </div>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#d4af37] hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> View on block explorer
          </a>
        </div>
      )}

      {(txState === 'confirmed' || txState === 'failed') && (
        <button onClick={onReset} className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5">
          {txState === 'confirmed' ? 'Send another payment' : 'Try again'}
        </button>
      )}
    </div>
  );
}