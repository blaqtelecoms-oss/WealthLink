import React from 'react';

export default function StatusPill({ value }) {
  const positive = ['ACTIVE','VERIFIED','APPROVED','AVAILABLE','PAID','MATURED'];
  const warning = ['PENDING','REQUESTED','UNDER_REVIEW','PROCESSING','PAYMENT_RECEIVED','FLAGGED_FOR_REVIEW'];
  const style = positive.includes(value) ? 'bg-[#c5a059]/10 text-[#d4af37] border-[#c5a059]/20' : warning.includes(value) ? 'bg-amber-400/10 text-amber-300 border-amber-400/20' : 'bg-rose-400/10 text-rose-300 border-rose-400/20';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide ${style}`}>{String(value || 'UNKNOWN').replaceAll('_',' ')}</span>;
}