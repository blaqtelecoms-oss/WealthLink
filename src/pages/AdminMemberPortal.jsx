import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/lib/supabaseData';
import PageHeader from '@/components/wealth/PageHeader';
import BackButton from '@/components/wealth/BackButton';
import MetricCard from '@/components/wealth/MetricCard';
import DataTable from '@/components/wealth/DataTable';
import StatusPill from '@/components/wealth/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, ShieldAlert, LogOut } from 'lucide-react';

function sumWallet(txs, balanceType) {
  return (txs || [])
    .filter((t) => t.balance_type === balanceType && t.status === 'POSTED')
    .reduce((s, t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'CREDIT' || t.type === 'RELEASE') return s + amt;
      if (t.type === 'DEBIT' || t.type === 'REVERSAL') return s - amt;
      return s;
    }, 0);
}

function fmt(v) {
  return (Number(v) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminMemberPortal() {
  const { memberId } = useParams();
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const unlock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('adminViewMember', {
        member_id: memberId,
        super_password: password,
      });
      setData(res.data);
      setAuthed(true);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Access denied');
    } finally {
      setLoading(false);
    }
  };

  const lock = () => {
    setAuthed(false);
    setData(null);
    setPassword('');
  };

  if (!authed) {
    return (
      <>
        <BackButton to="/admin" />
        <PageHeader
          eyebrow="Admin override"
          title="Member portal access"
          description="Enter the super password to view this member's portal."
        />
        <form onSubmit={unlock} className="mx-auto max-w-md rounded-2xl border border-[#c5a059]/20 bg-[#0b1525] p-6">
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-slate-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p>This access is audit-logged. Use only for verified member support. The super password is required for every session.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="superpw" className="text-xs text-slate-400">Super password</Label>
            <Input
              id="superpw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-white/10 bg-[#07101d]"
              autoFocus
            />
          </div>
          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
          <Button type="submit" disabled={loading || !password} className="mt-4 w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? 'Verifying...' : 'Unlock portal'}
          </Button>
        </form>
      </>
    );
  }

  const m = data?.member || {};
  const investments = data?.investments || [];
  const walletTxns = data?.wallet_transactions || [];
  const withdrawals = data?.withdrawals || [];
  const referrals = data?.referrals || { as_referrer: [], as_referred: [] };
  const kyc = data?.kyc_submissions || [];
  const banks = data?.bank_accounts || [];
  const incentives = data?.incentives || [];

  const totalInvested = investments.reduce((s, i) => s + Number(i.zar_equivalent || 0), 0);
  const activeCount = investments.filter((i) => i.investment_status === 'ACTIVE').length;
  const availableReward = sumWallet(walletTxns, 'AVAILABLE_REWARD');
  const pendingReward = sumWallet(walletTxns, 'PENDING_REWARD');

  return (
    <>
      <BackButton to="/admin" />
      <PageHeader
        eyebrow="Viewing as member"
        title={m.full_name || 'Member portal'}
        description={`Member #${m.member_number || (memberId || '').slice(-8)} · ${m.email || ''}`}
        action={<Button variant="outline" onClick={lock}><LogOut className="h-4 w-4" /> Lock</Button>}
      />

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <StatusPill value={m.member_status || 'ACTIVE'} />
        <StatusPill value={m.kyc_status || 'PENDING'} />
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-slate-400">{m.app_role || 'MEMBER'}</span>
        {m.referral_code && <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-slate-400">Code: {m.referral_code}</span>}
        {m.leadership_level > 0 && <span className="rounded-full border border-white/10 px-2.5 py-1 text-slate-400">Level: {m.leadership_level}</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Investments" value={investments.length} />
        <MetricCard label="Active" value={activeCount} tone="blue" />
        <MetricCard label="Total invested" value={`R ${fmt(totalInvested)}`} />
        <MetricCard label="Available reward" value={`R ${fmt(availableReward)}`} tone="amber" />
        <MetricCard label="Pending reward" value={`R ${fmt(pendingReward)}`} />
      </div>

      <section className="mt-8 rounded-2xl border border-white/10 bg-[#0b1525] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-white">Profile details</h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Member snapshot</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Detail label="Member number" value={m.member_number || '—'} />
          <Detail label="Email" value={m.email || '—'} />
          <Detail label="Mobile" value={m.mobile_number || '—'} />
          <Detail label="Country" value={m.country || '—'} />
          <Detail label="Date of birth" value={m.date_of_birth || '—'} />
          <Detail label="Referred by" value={m.referred_by_member_id || '—'} mono />
          <Detail label="Joined" value={m.created_date ? new Date(m.created_date).toLocaleDateString() : '—'} />
          <Detail label="Role" value={m.app_role || 'MEMBER'} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Investments</h2>
        <DataTable headers={['ID', 'Product', 'Amount', 'ZAR equiv', 'Status', 'Started']}>
          {investments.length === 0 ? (
            <tr><td className="px-5 py-6 text-center text-slate-500" colSpan={6}>No investments.</td></tr>
          ) : (
            investments.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-4 font-mono text-xs">{i.investment_id}</td>
                <td className="px-5 py-4">{i.product_name || '—'}</td>
                <td className="px-5 py-4">{fmt(i.investment_amount)} {i.currency}</td>
                <td className="px-5 py-4">R {fmt(i.zar_equivalent)}</td>
                <td className="px-5 py-4"><StatusPill value={i.investment_status} /></td>
                <td className="px-5 py-4 text-xs text-slate-400">{i.start_date || '—'}</td>
              </tr>
            ))
          )}
        </DataTable>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Wallet transactions</h2>
        <DataTable headers={['Date', 'Type', 'Balance', 'Amount', 'Description', 'Status']}>
          {walletTxns.length === 0 ? (
            <tr><td className="px-5 py-6 text-center text-slate-500" colSpan={6}>No wallet activity.</td></tr>
          ) : (
            walletTxns.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-4 text-xs text-slate-400">{t.timestamp ? new Date(t.timestamp).toLocaleString() : '—'}</td>
                <td className="px-5 py-4 text-xs">{t.type}</td>
                <td className="px-5 py-4 text-xs">{t.balance_type}</td>
                <td className="px-5 py-4 font-mono text-xs">R {fmt(t.amount)}</td>
                <td className="px-5 py-4 text-xs text-slate-400">{t.description || '—'}</td>
                <td className="px-5 py-4"><StatusPill value={t.status} /></td>
              </tr>
            ))
          )}
        </DataTable>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Withdrawals</h2>
        <DataTable headers={['ID', 'Amount', 'Bank', 'Status', 'Requested']}>
          {withdrawals.length === 0 ? (
            <tr><td className="px-5 py-6 text-center text-slate-500" colSpan={5}>No withdrawals.</td></tr>
          ) : (
            withdrawals.map((w) => (
              <tr key={w.id}>
                <td className="px-5 py-4 font-mono text-xs">{w.withdrawal_id}</td>
                <td className="px-5 py-4">R {fmt(w.amount)}</td>
                <td className="px-5 py-4 text-xs text-slate-400">{w.bank_account_masked || '—'}</td>
                <td className="px-5 py-4"><StatusPill value={w.status} /></td>
                <td className="px-5 py-4 text-xs text-slate-400">{w.requested_date ? new Date(w.requested_date).toLocaleString() : '—'}</td>
              </tr>
            ))
          )}
        </DataTable>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
          <h2 className="mb-3 font-semibold">Network — as referrer ({referrals.as_referrer.length})</h2>
          {referrals.as_referrer.length === 0 ? (
            <p className="text-sm text-slate-500">No downlines.</p>
          ) : (
            <div className="space-y-2">
              {referrals.as_referrer.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#07101d] p-3 text-xs">
                  <span className="font-mono text-slate-300">{r.referred_member_number || r.referred_user_id?.slice(-8)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Lvl {r.level}</span>
                    <StatusPill value={r.is_qualified ? 'VERIFIED' : 'PENDING'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
          <h2 className="mb-3 font-semibold">Network — referred by ({referrals.as_referred.length})</h2>
          {referrals.as_referred.length === 0 ? (
            <p className="text-sm text-slate-500">Not referred by anyone.</p>
          ) : (
            <div className="space-y-2">
              {referrals.as_referred.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#07101d] p-3 text-xs">
                  <span className="font-mono text-slate-300">{r.referrer_member_number || r.referrer_user_id?.slice(-8)}</span>
                  <span className="text-slate-500">Lvl {r.level}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
          <h2 className="mb-3 font-semibold">KYC submissions</h2>
          {kyc.length === 0 ? (
            <p className="text-sm text-slate-500">No KYC documents.</p>
          ) : (
            <div className="space-y-2">
              {kyc.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#07101d] p-3 text-xs">
                  <span className="text-slate-300">{k.document_type}</span>
                  <StatusPill value={k.status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
          <h2 className="mb-3 font-semibold">Bank accounts</h2>
          {banks.length === 0 ? (
            <p className="text-sm text-slate-500">No bank accounts.</p>
          ) : (
            <div className="space-y-2">
              {banks.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#07101d] p-3 text-xs">
                  <div>
                    <p className="text-slate-300">{b.bank_name}</p>
                    <p className="font-mono text-slate-500">{b.account_number_masked}</p>
                  </div>
                  <StatusPill value={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Incentives ({incentives.length})</h2>
        <DataTable headers={['ID', 'Type', 'Base', 'Pct', 'Amount', 'Status']}>
          {incentives.length === 0 ? (
            <tr><td className="px-5 py-6 text-center text-slate-500" colSpan={6}>No incentives.</td></tr>
          ) : (
            incentives.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-4 font-mono text-xs">{i.incentive_id}</td>
                <td className="px-5 py-4 text-xs">{i.incentive_type}</td>
                <td className="px-5 py-4 font-mono text-xs">R {fmt(i.base_amount)}</td>
                <td className="px-5 py-4 text-xs">{i.percentage}%</td>
                <td className="px-5 py-4 font-mono text-xs">R {fmt(i.amount)}</td>
                <td className="px-5 py-4"><StatusPill value={i.status} /></td>
              </tr>
            ))
          )}
        </DataTable>
      </section>
    </>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}