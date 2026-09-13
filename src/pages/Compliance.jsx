import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/lib/supabaseData';
import PageHeader from '@/components/wealth/PageHeader';
import BackButton from '@/components/wealth/BackButton';
import MetricCard from '@/components/wealth/MetricCard';
import DataTable from '@/components/wealth/DataTable';
import StatusPill from '@/components/wealth/StatusPill';
import { Button } from '@/components/ui/button';

export default function Compliance() {
  const [kyc, setKyc] = useState([]);
  const [flags, setFlags] = useState([]);
  const [investments, setInvestments] = useState([]);

  const load = () =>
    Promise.all([
      base44.entities.KYCSubmission.list('-created_date'),
      base44.entities.ComplianceFlag.list('-created_date'),
      base44.entities.Investment.list('-created_date'),
    ]).then(([kycItems, complianceFlags, investmentItems]) => {
      setKyc(kycItems);
      setFlags(complianceFlags);
      setInvestments(investmentItems);
    });

  useEffect(() => {
    load();
  }, []);

  async function review(id, status) {
    await base44.functions.invoke('adminControl', {
      action: 'REVIEW_KYC',
      id,
      status,
      reason: `Compliance review: ${status}`,
    });
    load();
  }

  const suspicious = useMemo(
    () => flags.filter((flag) => ['FLAGGED_FOR_REVIEW', 'INVESTIGATING'].includes(flag.status)),
    [flags]
  );

  return (
    <>
      <BackButton to="/admin" />
      <PageHeader
        eyebrow="Authorized compliance workspace"
        title="Compliance review dashboard"
        description="Signals identify records for review; they do not constitute an allegation or finding of fraud."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="KYC pending" value={kyc.filter((item) => item.status === 'PENDING').length} tone="amber" />
        <MetricCard label="Flagged for review" value={suspicious.length} tone="amber" />
        <MetricCard label="Reversed investments" value={investments.filter((item) => item.investment_status === 'REVERSED').length} />
        <MetricCard label="Rejected KYC" value={kyc.filter((item) => item.status === 'REJECTED').length} tone="blue" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">KYC review queue</h2>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{kyc.length} records</span>
        </div>

        <DataTable headers={['Member', 'Document', 'Submitted', 'Status', 'Review action']}>
          {kyc.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                No KYC submissions to review.
              </td>
            </tr>
          ) : (
            kyc.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 font-mono text-xs">{item.member_id}</td>
                <td className="px-5 py-4">{String(item.document_type || 'Document').replaceAll('_', ' ')}</td>
                <td className="px-5 py-4 text-slate-500">
                  {item.created_date ? new Date(item.created_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-5 py-4"><StatusPill value={item.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => review(item.id, 'UNDER_REVIEW')}>
                      Review
                    </Button>
                    <Button size="sm" className="bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]" onClick={() => review(item.id, 'APPROVED')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => review(item.id, 'REJECTED')}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Risk watchlist</h2>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{suspicious.length} active</span>
        </div>

        <DataTable headers={['Flag', 'Member', 'Status', 'Notes', 'Escalated']}>
          {suspicious.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                No active compliance flags.
              </td>
            </tr>
          ) : (
            suspicious.map((flag) => (
              <tr key={flag.id}>
                <td className="px-5 py-4 font-medium text-slate-200">{flag.flag_type || 'Review flag'}</td>
                <td className="px-5 py-4 font-mono text-xs">{flag.member_id || '—'}</td>
                <td className="px-5 py-4"><StatusPill value={flag.status} /></td>
                <td className="px-5 py-4 text-sm text-slate-400">{flag.notes || 'No notes recorded.'}</td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  {flag.created_date ? new Date(flag.created_date).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </section>
    </>
  );
}
