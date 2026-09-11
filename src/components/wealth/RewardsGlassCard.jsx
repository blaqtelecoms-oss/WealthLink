import React from 'react';

const money = n => `R ${Number(n || 0).toFixed(2)}`;

export default function RewardsGlassCard({ user, availableReward }) {
  const memberNumber = user?.member_number || 'WL-PENDING';
  const holder = (user?.full_name || 'Member').toUpperCase();

  return (
    <div className="glz-wl-wrap">
      <div
        className="glz-wl-card"
        tabIndex={0}
        role="img"
        aria-label={`WealthLink rewards card. Available reward balance ${money(availableReward)}. Member ${memberNumber}.`}
      >
        <div className="glz-wl-top">
          <span className="glz-wl-bank">WEALTHLINK<em>∞</em></span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 8.6a6.4 6.4 0 0 1 0 6.8M9.6 6.4a10.4 10.4 0 0 1 0 11.2M13.2 4.2a14.6 14.6 0 0 1 0 15.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
        <div className="glz-wl-chip" aria-hidden="true" />
        <div className="glz-wl-balance">
          <span className="glz-wl-balance-label">Available rewards</span>
          <span className="glz-wl-balance-value">{money(availableReward)}</span>
        </div>
        <div className="glz-wl-meta">
          <span><em>Card holder</em>{holder}</span>
          <span><em>Member</em>{memberNumber}</span>
          <span className="glz-wl-brand" aria-hidden="true"><i></i><i></i></span>
        </div>
      </div>
    </div>
  );
}