import React, { useEffect, useState } from 'react';
import { base44 } from '@/lib/supabaseData';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/wealth/PageHeader';
import BackButton from '@/components/wealth/BackButton';
import MetricCard from '@/components/wealth/MetricCard';
import DataTable from '@/components/wealth/DataTable';
import StatusPill from '@/components/wealth/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Save, Loader2 } from 'lucide-react';
import { CHAINS, truncateAddress } from '@/lib/coinbaseConfig';

export default function CoinbaseAdmin() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pendingInvestments, setPendingInvestments] = useState(0);

  const load = () => Promise.all([
    base44.entities.CoinbaseConfig.list('-updated_date', 1),
    base44.entities.CoinbaseTransaction.list('-timestamp', 50),
    base44.entities.Investment.filter({ payment_status: 'PENDING' }),
  ]).then(([configs, transactions, pendingInvs]) => {
    setConfig(configs[0] || { status: 'ACTIVE', default_chain_id: 8453, supported_tokens: 'ETH,USDC', treasury_wallet_address: '' });
    setTxns(transactions);
    setPendingInvestments(pendingInvs.length);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      if (config.id) {
        await base44.entities.CoinbaseConfig.update(config.id, config);
      } else {
        await base44.entities.CoinbaseConfig.create(config);
      }
      setMsg('Configuration saved.');
      load();
    } catch (err) { setMsg(err.message || 'Failed to save configuration.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="grid min-h-[50vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#d4af37]" /></div>;
  if (user?.role !== 'admin' && !['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'COMPLIANCE_OFFICER'].includes(user?.app_role)) {
    return <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-6 text-sm text-rose-300">Access restricted to administrators only.</div>;
  }

  const pending = txns.filter((t) => t.status === 'PENDING').length;
  const confirmed = txns.filter((t) => t.status === 'CONFIRMED').length;
  const failed = txns.filter((t) => t.status === 'FAILED').length;

  return (
    <>
      <BackButton to="/coinbase" />
      <PageHeader eyebrow="Coinbase administration" title="Coinbase settings & audit" description="Configure the Coinbase Wallet payment center and review all on-chain payment transactions." action={<StatusPill value={config?.status || 'INACTIVE'} />} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total payments" value={txns.length} />
        <MetricCard label="Confirmed" value={confirmed} tone="teal" />
        <MetricCard label="Pending" value={pending} tone="amber" />
        <MetricCard label="Failed" value={failed} tone="amber" />
        <MetricCard label="Investments pending" value={pendingInvestments} tone="amber" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={save} className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
          <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-[#d4af37]" /><h2 className="font-semibold text-white">Payment center config</h2></div>
          <div className="mt-4 space-y-3">
            <div><Label>Status</Label><Select className="mt-1" value={config.status} onValueChange={(v) => setConfig({ ...config, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">ACTIVE</SelectItem><SelectItem value="INACTIVE">INACTIVE</SelectItem></SelectContent></Select></div>
            <div><Label>Default network</Label><Select className="mt-1" value={String(config.default_chain_id)} onValueChange={(v) => setConfig({ ...config, default_chain_id: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.values(CHAINS).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Supported tokens (comma-separated)</Label><Input className="mt-1" value={config.supported_tokens} onChange={(e) => setConfig({ ...config, supported_tokens: e.target.value })} placeholder="ETH,USDC" /></div>
            <div><Label>Treasury wallet address</Label><Input className="mt-1 font-mono text-xs" value={config.treasury_wallet_address || ''} onChange={(e) => setConfig({ ...config, treasury_wallet_address: e.target.value })} placeholder="0x…" /></div>
          </div>
          {msg && <p className="mt-3 text-xs text-[#d4af37]">{msg}</p>}
          <Button type="submit" className="mt-4 w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save configuration
          </Button>
        </form>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">Payment audit trail</h2>
          <DataTable headers={['Date', 'Member', 'Wallet', 'Amount', 'Token', 'Network', 'Status', 'Explorer']}>
            {txns.length ? txns.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="px-5 py-4 text-xs text-slate-400">{t.timestamp ? new Date(t.timestamp).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-400">{t.member_id?.slice(-8)}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-400">{truncateAddress(t.wallet_address)}</td>
                <td className="px-5 py-4 text-sm font-medium">{t.amount}</td>
                <td className="px-5 py-4 text-xs">{t.token_symbol}</td>
                <td className="px-5 py-4 text-xs text-slate-400">{t.chain_name}</td>
                <td className="px-5 py-4"><StatusPill value={t.status} /></td>
                <td className="px-5 py-4">{t.block_explorer_url ? <a href={t.block_explorer_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#d4af37] hover:underline">View →</a> : '—'}</td>
              </tr>
            )) : <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-500">No payment transactions yet.</td></tr>}
          </DataTable>
        </section>
      </div>
    </>
  );
}