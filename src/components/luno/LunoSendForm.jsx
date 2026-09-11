import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';

export default function LunoSendForm({ balances, onSend, sending }) {
  const assets = balances.map((b) => b.asset);
  const [asset, setAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  useEffect(() => {
    if (!asset && assets.length) setAsset(assets[0]);
  }, [assets, asset]);

  const valid = asset && /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0 && recipient.trim().length > 5;

  const submit = (e) => {
    e.preventDefault();
    if (!valid || sending) return;
    onSend(asset, amount, recipient.trim());
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-white/10 bg-[#07101d] p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Send crypto</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Asset</Label>
          <Select value={asset || undefined} onValueChange={setAsset}>
            <SelectTrigger className="w-full bg-[#0b1525] border-white/10">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {assets.length === 0 && <SelectItem value="_none" disabled>No balances available</SelectItem>}
              {assets.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Amount</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="bg-[#0b1525] border-white/10"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-400">Recipient address</Label>
        <Input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x... or wallet address"
          className="bg-[#0b1525] border-white/10 font-mono text-sm"
        />
      </div>
      <Button type="submit" disabled={!valid || sending} className="w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? 'Sending...' : 'Send via Luno'}
      </Button>
    </form>
  );
}