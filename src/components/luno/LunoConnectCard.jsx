import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, Link2 } from 'lucide-react';

export default function LunoConnectCard({ onConnect, connecting }) {
  const [apiKeyId, setApiKeyId] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!apiKeyId.trim() || !apiSecret.trim()) return;
    onConnect(apiKeyId.trim(), apiSecret.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-[#c5a059]/15 bg-[#c5a059]/5 p-3 text-xs text-slate-400">
        <KeyRound className="h-4 w-4 shrink-0 text-[#d4af37] mt-0.5" />
        <p>
          Create a Luno API key at <span className="text-slate-200">Luno → Settings → API Keys</span> with
          <span className="text-slate-200"> View balance</span> and
          <span className="text-slate-200"> Send to any address</span> permissions. Your secret is encrypted at rest and never exposed in the browser.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="luno-key-id" className="text-xs text-slate-400">API Key ID</Label>
        <Input
          id="luno-key-id"
          value={apiKeyId}
          onChange={(e) => setApiKeyId(e.target.value)}
          placeholder="e.g. cnz2yjswbv3jd"
          className="bg-[#07101d] border-white/10"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="luno-secret" className="text-xs text-slate-400">API Key Secret</Label>
        <Input
          id="luno-secret"
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="••••••••••••••••"
          className="bg-[#07101d] border-white/10"
        />
      </div>
      <Button type="submit" disabled={connecting} className="w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]">
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        {connecting ? 'Connecting...' : 'Connect Luno account'}
      </Button>
    </form>
  );
}