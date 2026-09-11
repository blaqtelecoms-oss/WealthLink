import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function EmptyState({ title, description, icon: Icon, actionLabel, onAction }) {
  const FinalIcon = Icon || ShieldCheck;
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
      <FinalIcon className="mx-auto h-7 w-7 text-slate-500" />
      <h3 className="mt-3 font-medium text-slate-200">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c5a059] text-[#0a0e14] text-sm font-semibold hover:bg-[#d4af37] transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  );
}