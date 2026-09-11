import React from 'react';

export default function DataTable({ headers, children }) {
  return <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0b1525]"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[.02] text-[10px] uppercase tracking-[.14em] text-slate-500"><tr>{headers.map(h=><th key={h} className="px-5 py-4 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{children}</tbody></table></div>;
}