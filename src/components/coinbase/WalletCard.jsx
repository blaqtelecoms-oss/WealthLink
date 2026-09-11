import React from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Unlink, Loader2, Link2 } from 'lucide-react';
import { truncateAddress, CHAINS } from '@/lib/coinbaseConfig';

export default function WalletCard({ address, chainId, connecting, onConnect, onDisconnect }) {
  const isConnected = !!address;
  const chain = CHAINS[chainId];

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c5a059]/10 text-[#d4af37]">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Connect your wallet</h2>
            <p className="text-sm text-slate-400">Connect your Coinbase Wallet to send a payment.</p>
          </div>
        </div>
        <Button className="mt-5 w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]" onClick={onConnect} disabled={connecting}>
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          {connecting ? 'Connecting...' : 'Connect Coinbase Wallet'}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#c5a059]/20 bg-[#c5a059]/5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c5a059] text-[#0a0e14]">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#d4af37]">Wallet connected</p>
            <p className="font-mono text-xs text-slate-400">{truncateAddress(address)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDisconnect} className="border-white/10 text-slate-300">
          <Unlink className="h-3.5 w-3.5" /> Disconnect
        </Button>
      </div>
      {chain && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-[#07101d] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-slate-300">{chain.name} (Chain ID {chain.id})</span>
        </div>
      )}
    </div>
  );
}