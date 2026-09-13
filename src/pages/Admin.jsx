import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/lib/supabaseData';
import { useAuth } from '@/lib/AuthContext';
import { getAdminUserInfo } from '@/lib/adminAuth';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight, Coins, ShieldCheck, Users, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/wealth/PageHeader';
import BackButton from '@/components/wealth/BackButton';
import MetricCard from '@/components/wealth/MetricCard';
import DataTable from '@/components/wealth/DataTable';
import StatusPill from '@/components/wealth/StatusPill';
import AdminGuard from '@/components/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const trend = [
  { d: 'Mon', members: 12, investment: 42000 },
  { d: 'Tue', members: 18, investment: 68000 },
  { d: 'Wed', members: 25, investment: 51000 },
  { d: 'Thu', members: 31, investment: 94000 },
  { d: 'Fri', members: 38, investment: 121000 },
  { d: 'Sat', members: 42, investment: 73000 },
  { d: 'Sun', members: 49, investment: 108000 },
];

function Field({ label, value, onChange }) {
  return (
    <label className="text-xs text-slate-400">
      <span className="mb-1 block">{label}</span>
      <Input
        className="mt-1"
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ActionCard({ title, description, to, icon: Icon }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-white/10 bg-[#0b1525] p-5 transition hover:border-[#c5a059]/40 hover:bg-[#101b2d]"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#c5a059]/10 text-[#d4af37]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-[#d4af37]" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </Link>
  );
}

function AdminContent() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const results = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Investment.list(),
        base44.entities.Incentive.list(),
        base44.entities.Withdrawal.list(),
        base44.entities.IncentiveConfiguration.list('-updated_date', 1),
      ]);

      const [members, investments, incentives, withdrawals, configs] = results;
      setData({ members, investments, incentives, withdrawals });
      setConfig(configs[0]);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError('Failed to load dashboard data. Please try again.');
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminInfo = async () => {
    try {
      const info = await getAdminUserInfo(user?.id);
      setAdminInfo(info);
    } catch (err) {
      console.error('Error loading admin info:', err);
    }
  };

  useEffect(() => {
    load();
    loadAdminInfo();
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!data?.members) return [];

    return data.members.filter((member) =>
      [
        member.member_number,
        member.full_name,
        member.email,
        member.mobile_number,
        member.referral_code,
        member.kyc_status,
        member.member_status,
      ].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))
    );
  }, [data, search]);

  const investmentVolume = useMemo(() => {
    if (!data?.investments) return 0;
    return data.investments.reduce((sum, investment) => sum + Number(investment.zar_equivalent || 0), 0);
  }, [data]);

  async function save(e) {
    e.preventDefault();
    try {
      setIsSaving(true);
      setMessage('');
      const response = await base44.functions.invoke('adminControl', {
        action: 'SAVE_CONFIG',
        config,
        reason: 'Administrator configuration update',
      });
      setConfig(response.data.result);
      setMessage('✓ Configuration saved and audit logged.');
      toast.success('Configuration saved successfully');
    } catch (err) {
      console.error('Error saving config:', err);
      setMessage('✗ Failed to save configuration.');
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  }

  async function reviewInvestment(id, status) {
    try {
      await base44.functions.invoke('adminControl', {
        action: 'REVIEW_INVESTMENT',
        id,
        status,
        reason: `Finance review: ${status}`,
      });
      setMessage(`✓ Investment moved to ${status}.`);
      toast.success(`Investment reviewed: ${status}`);
      load();
    } catch (err) {
      console.error('Error reviewing investment:', err);
      toast.error('Failed to review investment');
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-teal-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <BackButton to="/" />
        <PageHeader
          eyebrow="Administrative control centre"
          title="Error loading dashboard"
          description="An error occurred while loading admin data."
        />
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white">Failed to load data</h3>
              <p className="mt-1 text-sm text-slate-400">{error}</p>
              <Button onClick={load} className="mt-4 bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]">
                Try again
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!data || !config) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-teal-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading platform data...</p>
        </div>
      </div>
    );
  }

  const pendingWithdrawals = data.withdrawals.filter((withdrawal) =>
    ['REQUESTED', 'UNDER_REVIEW'].includes(withdrawal.status)
  ).length;

  return (
    <>
      <BackButton to="/" />
      <PageHeader
        eyebrow="Administrative control centre"
        title="Platform administration"
        description="Operational metrics, member oversight and controlled incentive rules."
        action={
          <div className="flex items-center gap-2">
            <StatusPill value={user?.app_role || 'ADMIN'} />
            {adminInfo?.access_level && (
              <span className="text-xs text-slate-400 px-2">
                Access: {adminInfo.access_level}
              </span>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total members" value={data.members.length} />
        <MetricCard label="KYC verified" value={data.members.filter((member) => member.kyc_status === 'VERIFIED').length} />
        <MetricCard label="Growth partners" value={data.members.filter((member) => member.app_role === 'GROWTH_PARTNER').length} />
        <MetricCard label="Investment volume" value={`R ${investmentVolume.toFixed(2)}`} tone="blue" />
        <MetricCard label="Pending withdrawals" value={pendingWithdrawals} tone="amber" />
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <ActionCard
          title="Compliance desk"
          description="Review KYC checks, investigate flags, and clear operational safety actions."
          to="/compliance"
          icon={ShieldCheck}
        />
        <ActionCard
          title="Coinbase admin"
          description="Manage treasury settings, wallet config, and audit the payment center."
          to="/coinbase/admin"
          icon={Coins}
        />
        <ActionCard
          title="Member access"
          description="Open the latest member record and trace wallet, investment and referral data."
          to={filtered[0] ? `/admin/member/${filtered[0].id}` : '/admin'}
          icon={Users}
        />
      </section>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Incentive configuration</h2>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={Boolean(config.programme_enabled)}
                onChange={(e) => setConfig({ ...config, programme_enabled: e.target.checked })}
              />
              Enabled
            </label>
          </div>

          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Direct %" value={config.direct_percentage || 0} onChange={(value) => setConfig({ ...config, direct_percentage: value })} />
              <Field label="Leadership %" value={config.leadership_percentage || 0} onChange={(value) => setConfig({ ...config, leadership_percentage: value })} />
              <Field label="Qualification" value={config.qualification_requirement || 0} onChange={(value) => setConfig({ ...config, qualification_requirement: value })} />
              <Field label="Max levels" value={config.maximum_leadership_levels || 0} onChange={(value) => setConfig({ ...config, maximum_leadership_levels: value })} />
              <Field label="Minimum transaction" value={config.minimum_qualifying_transaction || 0} onChange={(value) => setConfig({ ...config, minimum_qualifying_transaction: value })} />
              <label className="flex items-end gap-2 pb-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={Boolean(config.approval_required)}
                  onChange={(e) => setConfig({ ...config, approval_required: e.target.checked })}
                />
                Approval required
              </label>
            </div>

            {message && (
              <p className={`text-xs ${message.startsWith('✓') ? 'text-teal-300' : 'text-red-300'}`}>
                {message}
              </p>
            )}

            <Button type="submit" disabled={isSaving} className="w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]">
              {isSaving ? 'Saving...' : 'Save & audit changes'}
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Finance review queue</h2>
          <div className="space-y-3">
            {data.investments.length === 0 ? (
              <p className="text-sm text-slate-500">No investment activity to review.</p>
            ) : (
              data.investments.slice(0, 5).map((investment) => (
                <div key={investment.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#07101d] p-3">
                  <div>
                    <p className="font-mono text-xs text-slate-300">{investment.investment_id}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {investment.member_id || 'Member'} · R {Number(investment.zar_equivalent || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill value={investment.investment_status} />
                    <Button size="sm" variant="outline" onClick={() => reviewInvestment(investment.id, 'PAYMENT_RECEIVED')}>
                      Review
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Member management</h2>
          <Input
            className="max-w-sm"
            placeholder="Search ID, name, email, phone, code, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DataTable headers={['Member ID', 'Name', 'Contact', 'Referral code', 'KYC', 'Status', 'Role', 'Actions']}>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                No members match the current filter.
              </td>
            </tr>
          ) : (
            filtered.map((member) => (
              <tr key={member.id}>
                <td className="px-5 py-4 font-mono text-xs">{member.member_number || member.id.slice(-8)}</td>
                <td className="px-5 py-4">{member.full_name}</td>
                <td className="px-5 py-4">
                  <p>{member.email}</p>
                  <p className="text-xs text-slate-500">{member.mobile_number}</p>
                </td>
                <td className="px-5 py-4 font-mono text-xs">{member.referral_code}</td>
                <td className="px-5 py-4"><StatusPill value={member.kyc_status || 'PENDING'} /></td>
                <td className="px-5 py-4"><StatusPill value={member.member_status || 'ACTIVE'} /></td>
                <td className="px-5 py-4 text-xs">{member.app_role || 'MEMBER'}</td>
                <td className="px-5 py-4">
                  <Link
                    to={`/admin/member/${member.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#c5a059]/30 bg-[#c5a059]/10 px-2.5 py-1 text-xs text-[#d4af37] hover:bg-[#c5a059]/20"
                  >
                    View portal
                  </Link>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </section>
    </>
  );
}

export default function Admin() {
  return (
    <AdminGuard requiredLevel="ADMIN">
      <AdminContent />
    </AdminGuard>
  );
}
