import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/wealth/PageHeader';
import StatusPill from '@/components/wealth/StatusPill';
import { COMMISSION_RATE, formatCurrency } from '@/lib/simulation';
import { Copy, Share2, MessageCircle, UserRound, GitBranch, Link2, Coins } from 'lucide-react';

const COMMISSION_EXAMPLES = [
  { investment: 35, commission: 35 * COMMISSION_RATE },
  { investment: 100, commission: 100 * COMMISSION_RATE },
  { investment: 300, commission: 300 * COMMISSION_RATE },
  { investment: 700, commission: 700 * COMMISSION_RATE },
  { investment: 1000, commission: 1000 * COMMISSION_RATE },
];

export default function Network() {
  const { user } = useAuth();
  const [refs, setRefs] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) base44.entities.ReferralRelationship.filter({ referrer_user_id: user.id }, 'relationship_date').then(setRefs);
  }, [user]);

  const link = `https://wealth-link-nexus.com/register?ref=${user?.referral_code || ''}`;
  const copy = () => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join WealthLink Partner Network', url: link });
      } catch (e) {
        if (e.name !== 'AbortError') copy();
      }
    } else {
      copy();
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Referral & partner network"
        title="Invite & Grow"
        description="Share your unique link. Earn 3% commission on every linked member's investment — paid once when their investment becomes active." />

      <div className="space-y-6">
        {/* Commission banner */}
        <div className="rounded-2xl border border-[#c5a059]/20 bg-gradient-to-r from-[#c5a059]/10 to-transparent p-4 flex items-center gap-3">
          <Coins className="w-5 h-5 text-[#d4af37] shrink-0" />
          <p className="text-sm font-medium text-white">Earn <span className="text-[#d4af37] font-bold">3% Commission</span> on every linked member's investment</p>
        </div>

        {/* Referral link + QR */}
        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-2xl border border-white/10 bg-[#0b1525] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-500">Your referral code</p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-widest text-[#d4af37]">{user?.referral_code || 'PENDING'}</p>
            <div className="mt-5 rounded-xl border border-white/10 bg-[#07101d] p-3 font-mono text-xs text-slate-400 break-all">{link}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={copy} className="bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]"><Copy className="mr-2 h-4 w-4" />{copied ? 'Copied' : 'Copy link'}</Button>
              <Button variant="outline" onClick={share}><Share2 className="mr-2 h-4 w-4" />Share</Button>
              <Button variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on WealthLink: ${link}`)}`, '_blank')}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button>
            </div>
          </section>
          <section className="flex flex-col items-center rounded-2xl border border-white/10 bg-white p-5 text-slate-950">
            <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`} alt="Referral link QR code" className="h-44 w-44" fittingType="fit" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest">Scan to join</p>
          </section>
        </div>

        {/* What is Linking? */}
        <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Link2 className="h-5 w-5 text-[#d4af37]" />
            <h2 className="font-semibold text-white">What is Linking?</h2>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Linking is WealthLink's referral program. When someone joins using your unique link and makes an investment,
            you earn a <span className="text-[#d4af37] font-semibold">3% commission</span> of their investment amount.
            This is a once-off payment, credited to your rewards wallet when the member's investment becomes active.
          </p>

          {/* Commission examples */}
          <div className="mt-5">
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Examples of Linking Rewards</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COMMISSION_EXAMPLES.map((ex) => (
                <div key={ex.investment} className="rounded-xl border border-white/10 bg-[#1c2530] p-4">
                  <p className="text-xs text-slate-500">Member invests</p>
                  <p className="text-lg font-semibold text-white">{formatCurrency(ex.investment)}</p>
                  <div className="mt-2 border-t border-white/5 pt-2">
                    <p className="text-xs text-slate-500">Your commission (3%)</p>
                    <p className="text-lg font-bold text-[#d4af37]">{formatCurrency(ex.commission)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Network tree */}
        <section className="rounded-2xl border border-white/10 bg-[#0b1525] p-6">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-[#d4af37]" />
            <div>
              <h2 className="font-semibold text-white">Level 1 — Direct Link</h2>
              <p className="text-xs text-slate-500">Your direct introductions · 3% commission per active investment</p>
            </div>
          </div>
          <div className="mt-7 flex flex-col items-center">
            <div className="rounded-2xl border border-[#c5a059]/30 bg-[#c5a059]/10 px-6 py-4 text-center">
              <UserRound className="mx-auto h-5 w-5 text-[#d4af37]" />
              <p className="mt-2 text-sm font-medium text-white">{user?.full_name}</p>
              <p className="text-xs text-slate-500">{user?.member_number || 'YOU (Inviter)'}</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {refs.map((r) => (
                <button key={r.id} className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-left">
                  <div className="flex items-center justify-between">
                    <UserRound className="h-4 w-4 text-slate-500" />
                    <StatusPill value={r.is_qualified ? 'VERIFIED' : 'PENDING'} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">{r.referred_member_number}</p>
                  <p className="mt-1 text-xs text-slate-500">Direct introduction · Level 1</p>
                </button>
              ))}
              {!refs.length && <p className="col-span-full py-8 text-center text-sm text-slate-500">Your direct introductions will appear here.</p>}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}