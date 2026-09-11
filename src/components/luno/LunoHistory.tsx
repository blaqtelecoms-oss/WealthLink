import React from 'react';
import StatusPill from '@/components/wealth/StatusPill';
import { History } from 'lucide-react';

export default function LunoHistory({ transactions }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <History className="h-4 w-4 text-[#d4af37]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent Luno sends</h3>
      </div>
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No sends yet.</p>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="rounded-lg border border-white/10 bg-[#07101d] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">{tx.amount} {tx.asset}</span>
                <StatusPill value={tx.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">{tx.recipient_address}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}