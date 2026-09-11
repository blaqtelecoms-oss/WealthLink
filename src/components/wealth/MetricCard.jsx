import React from 'react';

export default function MetricCard({ label, value, detail, tone = 'teal' }) {
  const tones = { teal: 'from-[#c5a059]/15 to-transparent border-[#c5a059]/20', blue: 'from-blue-400/15 to-transparent border-blue-400/20', amber: 'from-amber-400/15 to-transparent border-amber-400/20' };
  return <div className={`rounded-2xl border bg-gradient-to-br ${tones[tone]} p-5`}><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>;
}