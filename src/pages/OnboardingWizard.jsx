import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, TrendingUp, Network, ShieldCheck, Sparkles, Rocket, User, Loader2 } from 'lucide-react';
import Logo from '@/components/wealth/Logo';
import ProfileSetupStep from '@/components/wealth/ProfileSetupStep';

const steps = [
  {
    icon: Sparkles,
    title: 'Welcome to WealthLink',
    subtitle: 'Your partner in transparent, compliant wealth growth.',
    body: 'Create your Coinbase or Luno account, complete your KYC verification, then connect your account to WealthLink to start investing.',
    points: ['Compliance-first design', 'Transparent reward ledger', 'Coinbase & Luno crypto payments'],
  },
  {
    icon: TrendingUp,
    title: 'Invest & Grow Daily',
    subtitle: 'Watch your investments grow with our Growth Index simulator.',
    body: 'Start from just $35 with a 14-day maturity plan, or choose $100+ plans with 30, 45, 60, or 90-day options. Our contract models growth at 1.5% daily based on the WealthLink Growth Index.',
    points: ['$35 starter plan available', '1.5% daily simulated growth', 'Multiple maturity options'],
  },
  {
    icon: Network,
    title: 'Build Your Partner Network',
    subtitle: 'Earn 3% referral commission on your direct introductions.',
    body: 'Share your unique referral link, invite partners, and earn commission on their investment activity. Track your network growth and partner qualification progress in real time.',
    points: ['3% direct referral commission', 'Partner qualification tracking', 'Unique referral code & QR sharing'],
  },
  {
    icon: ShieldCheck,
    title: 'Stay Verified & Secure',
    subtitle: 'Compliance protects you and your rewards.',
    body: 'Complete your KYC verification and connect your Coinbase or Luno account to unlock investments and withdrawals. Your sensitive documents are private and visible only to authorized compliance personnel.',
    points: ['KYC required for investment & withdrawal', 'Coinbase or Luno account connection', 'Self-custody crypto payments'],
  },
  {
    icon: Rocket,
    title: 'You\u2019re Ready to Begin',
    subtitle: 'Complete your profile to unlock the full platform.',
    body: 'Complete your profile on the next step, then head to your dashboard to explore investments, share your referral link, and complete your KYC verification.',
    points: ['Explore investment plans', 'Share your referral link', 'Complete KYC verification'],
  },
  {
    icon: User,
    title: 'Set Up Your Profile',
    subtitle: 'A few details to complete your member record.',
    body: 'Tell us a bit about yourself so we can personalise your experience and keep your account secure.',
    isProfile: true,
  },
];

export default function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    mobile_number: user?.mobile_number || '',
    country: user?.country || 'South Africa',
    referral_link: '',
  });
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const Icon = current.icon;

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const handleComplete = async () => {
    setSaving(true);
    setError('');
    try {
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: profileForm.full_name,
          mobile_number: profileForm.mobile_number,
          country: profileForm.country,
        },
      });

      if (userUpdateError) throw userUpdateError;

      if (profileForm.referral_link.trim()) {
        try {
          await supabase.functions.invoke('linkReferral', {
            body: { referralLink: profileForm.referral_link.trim() },
          });
        } catch (refErr) {
          // Non-blocking: profile is saved, referral just fails
          setError(refErr?.message || 'Could not link referral code.');
          setSaving(false);
          return;
        }
      }
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Could not save your profile.');
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e14] text-slate-100" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <div>
            <p className="text-sm font-bold tracking-[.14em] text-white">WEALTHLINK</p>
            <p className="text-[9px] tracking-[.22em] text-slate-500">PARTNER NETWORK</p>
          </div>
        </div>
        {!isLast && (
          <button onClick={() => setStep(steps.length - 1)} className="text-sm text-slate-500 transition hover:text-slate-300">
            Skip
          </button>
        )}
      </header>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 px-6 pb-4">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-[#d4af37]' : i < step ? 'w-4 bg-[#c5a059]/50' : 'w-4 bg-white/10'}`}
          />
        ))}
      </div>

      {/* Step content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-6">
        <div className="w-full max-w-lg">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#c5a059]/20 to-[#d4af37]/5 border border-[#c5a059]/20">
            <Icon className="h-10 w-10 text-[#d4af37]" />
          </div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-[#d4af37]">Step {step + 1} of {steps.length}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{current.title}</h1>
          <p className="mt-2 text-sm text-[#c5a059]">{current.subtitle}</p>
          <p className="mt-4 text-sm leading-6 text-slate-400">{current.body}</p>
          {current.isProfile ? (
            <div className="mt-5">
              <ProfileSetupStep form={profileForm} setForm={setProfileForm} />
              {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
            </div>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {current.points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c5a059]/15 text-[#d4af37]">
                    <Check className="h-3 w-3" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Navigation */}
      <footer className="px-6 py-5" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={back} disabled={saving} className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {isLast ? (
            <Button size="lg" onClick={handleComplete} disabled={saving} className="flex-1 bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  Complete Setup <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button size="lg" onClick={next} className="flex-1 bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}