import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CHAINS, TOKENS } from '@/lib/coinbaseConfig';

export default function PaymentForm({ recipient, amount, tokenSymbol, selectedChainId, onChange }) {
  const tokens = TOKENS[selectedChainId] || {};
  const availableTokens = Object.values(tokens);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-6">
      <h2 className="text-lg font-semibold text-white">Payment details</h2>
      <p className="mt-1 text-sm text-slate-400">Enter the recipient address, amount and token you want to send.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Network</Label>
          <Select className="mt-1" value={String(selectedChainId)} onValueChange={(v) => onChange('selectedChainId', Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(CHAINS).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Token</Label>
          <Select className="mt-1" value={tokenSymbol} onValueChange={(v) => onChange('tokenSymbol', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableTokens.map((t) => <SelectItem key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Recipient address</Label>
          <Input className="mt-1 font-mono text-sm" placeholder="0x..." value={recipient} onChange={(e) => onChange('recipient', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Amount ({tokenSymbol})</Label>
          <Input className="mt-1" type="number" step="0.000001" min="0" placeholder="0.00" value={amount} onChange={(e) => onChange('amount', e.target.value)} />
        </div>
      </div>
    </div>
  );
}