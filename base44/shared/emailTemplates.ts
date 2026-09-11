// Branded HTML email templates + sendEmail helper for WealthLink.
// All recipients are registered app users, so SendEmail delivers without a custom domain.
// Every send is wrapped by the caller in try/catch so an email failure never breaks the parent flow.

const APP_URL = 'https://wealth-link-nexus.base44.app';
const GOLD = '#d4af37';
const BG = '#0a0e14';
const CARD = '#0b1525';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';

function shell(inner: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WealthLink</title>
<style>
  body{margin:0;padding:0;background:${BG};font-family:'Space Grotesk',ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${TEXT};-webkit-font-smoothing:antialiased}
  .wrap{max-width:560px;margin:0 auto;padding:32px 20px 40px}
  .card{background:${CARD};border:1px solid rgba(212,175,55,.18);border-radius:18px;padding:32px 28px}
  .eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${GOLD};font-weight:700;margin:0 0 12px}
  h1{font-size:24px;line-height:1.2;margin:0 0 16px;font-weight:600;color:#fff;letter-spacing:-.01em}
  p{font-size:15px;line-height:1.65;color:${TEXT};margin:0 0 14px}
  .muted{color:${MUTED}}
  .cta{display:inline-block;margin:8px 0 4px;padding:13px 26px;background:${GOLD};color:#0a0e14;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:.02em}
  .row{display:flex;justify-content:space-between;padding:11px 0;border-top:1px solid rgba(255,255,255,.07);font-size:14px}
  .row span:first-child{color:${MUTED}}
  .row span:last-child{color:#fff;font-weight:600}
  .foot{margin-top:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;line-height:1.6;color:${MUTED};text-align:center}
  .brand{font-size:13px;font-weight:700;letter-spacing:.28em;color:${GOLD};text-align:center;margin:0 0 24px}
  ul{padding-left:18px;margin:0 0 14px}
  li{font-size:15px;line-height:1.65;color:${TEXT};margin:0 0 8px}
  @media (max-width:520px){.card{padding:24px 18px}h1{font-size:21px}}
</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<div class="wrap">
  <p class="brand">WEALTHLINK</p>
  <div class="card">
    ${inner}
  </div>
  <div class="foot">WealthLink Partner Network &middot; This is an automated message.<br>Investments carry market risk. Past performance does not guarantee future results.</div>
</div>
</body>
</html>`;
}

export function welcomeTemplate(fullName: string): { subject: string; html: string; preheader: string } {
  const inner = `
    <p class="eyebrow">Welcome aboard</p>
    <h1>Hi ${fullName || 'there'}, welcome to WealthLink</h1>
    <p>WealthLink is a secure, compliance-first platform that helps you grow your wealth through transparent investment tracking and a genuine partner network — all from one dashboard.</p>
    <p><strong>What is WealthLink?</strong></p>
    <ul>
      <li>📊 Track and manage your investments in one place</li>
      <li>🔐 Connect Coinbase or Luno to fund securely</li>
      <li>🤝 Grow a partner network through real referrals</li>
      <li>🏆 Earn rewards when your network thrives</li>
    </ul>
    <p><strong>How do you make money?</strong></p>
    <ul>
      <li><strong>1. Invest</strong> — Pick a plan (Starter from $35 up to Premium). Your investment grows at a projected 1.5% daily rate over your chosen term (14–90 days). <span class="muted">Returns are illustrative and not guaranteed — always invest within your means.</span></li>
      <li><strong>2. Refer &amp; earn</strong> — Share your unique referral code. When someone you introduce invests, you earn a direct incentive on their contribution.</li>
      <li><strong>3. Leadership rewards</strong> — As your network grows and you meet qualification targets, you unlock leadership bonuses on real activity within your team.</li>
    </ul>
    <p><strong>Getting started</strong></p>
    <ul>
      <li>✅ Complete your KYC (Bank Confirmation letter)</li>
      <li>🔗 Connect your Coinbase or Luno account</li>
      <li>💳 Choose a plan and fund your investment</li>
      <li>📣 Share your referral code to start building</li>
    </ul>
    <p class="muted">Every investment and withdrawal requires verified KYC, and all transactions are recorded on an audited ledger. We never promise guaranteed returns — rewards come from real investment activity, not recruitment alone.</p>
    <a href="${APP_URL}/profile" class="cta">Complete your profile</a>
    <p class="muted" style="margin-top:18px">If you have any questions, our support team is here to help.</p>`;
  return { subject: "Welcome to WealthLink — here's how to get started", html: shell(inner, 'Your account is ready — what WealthLink is and how you earn.'), preheader: 'Your account is ready — what WealthLink is and how you earn.' };
}

export function paymentSuccessTemplate(fullName: string, planName: string, amountUsd: number, txRef: string): { subject: string; html: string; preheader: string } {
  const inner = `
    <p class="eyebrow">Payment confirmed</p>
    <h1>Your investment is now active</h1>
    <p>We've confirmed your on-chain payment and activated your investment. You can track its progress from your dashboard.</p>
    <div style="margin:18px 0">
      <div class="row"><span>Plan</span><span>${planName}</span></div>
      <div class="row"><span>Amount</span><span>$${amountUsd.toFixed(2)}</span></div>
      <div class="row"><span>Transaction</span><span style="font-family:monospace;font-size:12px">${txRef.slice(0, 18)}…</span></div>
      <div class="row"><span>Status</span><span>Confirmed</span></div>
    </div>
    <a href="${APP_URL}/investments" class="cta">View your investments</a>`;
  return { subject: 'Payment confirmed — your investment is active', html: shell(inner, 'Your on-chain payment was confirmed.'), preheader: 'Your on-chain payment was confirmed.' };
}

export function referralLinkedTemplate(referrerName: string, newMemberName: string): { subject: string; html: string; preheader: string } {
  const inner = `
    <p class="eyebrow">Network growth</p>
    <h1>Someone joined using your referral</h1>
    <p>Great news, ${referrerName || 'partner'} — <strong>${newMemberName || 'a new member'}</strong> just joined WealthLink using your referral code.</p>
    <p>When they complete their first qualifying investment, you'll be credited a direct introduction reward automatically. Keep sharing your link to grow your network and unlock leadership rewards.</p>
    <a href="${APP_URL}/network" class="cta">View your network</a>`;
  return { subject: 'New referral joined your network', html: shell(inner, 'A new member joined using your referral code.'), preheader: 'A new member joined using your referral code.' };
}

export function rewardCreditedTemplate(fullName: string, amountZar: number, incentiveType: string, sourceMemberNumber: string): { subject: string; html: string; preheader: string } {
  const typeLabel = incentiveType === 'LEADERSHIP' ? 'Leadership reward' : 'Direct introduction reward';
  const inner = `
    <p class="eyebrow">Reward credited</p>
    <h1>A ${incentiveType === 'LEADERSHIP' ? 'leadership' : 'direct'} reward was credited to your wallet</h1>
    <p>Your network earned you a reward from a qualifying investment by member <strong>${sourceMemberNumber || 'a referred member'}</strong>.</p>
    <div style="margin:18px 0">
      <div class="row"><span>Reward type</span><span>${typeLabel}</span></div>
      <div class="row"><span>Amount</span><span>R ${amountZar.toFixed(2)}</span></div>
      <div class="row"><span>Status</span><span>Credited</span></div>
    </div>
    <a href="${APP_URL}/wallet" class="cta">View your wallet</a>`;
  return { subject: 'A reward was credited to your wallet', html: shell(inner, 'A reward was credited to your WealthLink wallet.'), preheader: 'A reward was credited to your WealthLink wallet.' };
}

export function withdrawalPaidTemplate(fullName: string, amountZar: number, paymentReference: string): { subject: string; html: string; preheader: string } {
  const inner = `
    <p class="eyebrow">Withdrawal paid</p>
    <h1>Your withdrawal has been paid</h1>
    <p>Your withdrawal request has been processed and the funds sent to your verified bank account.</p>
    <div style="margin:18px 0">
      <div class="row"><span>Amount</span><span>R ${amountZar.toFixed(2)}</span></div>
      <div class="row"><span>Payment reference</span><span>${paymentReference || '—'}</span></div>
      <div class="row"><span>Status</span><span>Paid</span></div>
    </div>
    <a href="${APP_URL}/wallet" class="cta">View your wallet</a>`;
  return { subject: 'Your withdrawal has been paid', html: shell(inner, 'Your withdrawal request has been paid out.'), preheader: 'Your withdrawal request has been paid out.' };
}

// Thin wrapper around the Core SendEmail integration. Always resolves (never throws)
// so a delivery hiccup can't roll back the parent business transaction.
export async function sendEmail(base44: any, to: string, subject: string, html: string): Promise<void> {
  try {
    if (!to) return;
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, html });
  } catch (err) {
    console.error('email send failed', { to, subject, error: err?.message || String(err) });
  }
}