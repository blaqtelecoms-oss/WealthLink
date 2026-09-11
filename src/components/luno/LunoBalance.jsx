import React from 'react';
import { Loader2, Wallet, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function formatBalance(v) {
  if (!Number.isFinite(v)) return '0';
  const fixed = v.toFixed(8);
  return fixed.replace(/\.?0+$/, '');
}

function truncateAddr(a) {
  if (!a) return '';
  if (a.length <= 16) return a;
  return `${a.slice(0, 10)}…${a.slice(-6)}`;
}

export default function LunoBalances({ balances, addresses = [], loading }) {
  const { toast } = useToast();
  const addrMap = React.useMemo(
    () => Object.fromEntries(addresses.map((a) => [a.asset, a.address])),
    [addresses]
  );

  const copyAddress = (asset, addr) => {
    navigator.clipboard.writeText(addr).then(
      () => toast({ title: `${asset} address copied`, description: 'Ready to paste into your wallet.' }),
      () => toast({ title: 'Copy failed', variant: 'destructive' })
    );
  };

  if (loading && balances.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" />
      </div>
    );
  }
  if (balances.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No balances available.</p>;
  }
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Balances</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {balances.map((b) => {
          const addr = addrMap[b.asset];
          return (
            <div key={b.account_id} className="rounded-xl border border-white/10 bg-[#07101d] p-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="text-xs font-semibold text-slate-300">{b.asset}</span>
              </div>
              <p className="mt-1.5 font-mono text-sm font-semibold text-white">{formatBalance(b.balance)}</p>
              {b.reserved > 0 && <p className="mt-0.5 text-xs text-slate-500">Reserved: {formatBalance(b.reserved)}</p>}
              {addr && (
                <button
                  onClick={() => copyAddress(b.asset, addr)}
                  className="mt-2 flex w-full items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-left hover:border-[#c5a059]/30"
                  title={`Copy ${b.asset} deposit address`}
                >
                  <Copy className="h-3 w-3 shrink-0 text-slate-500" />
                  <span className="truncate font-mono text-xs text-slate-400">{truncateAddr(addr)}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}