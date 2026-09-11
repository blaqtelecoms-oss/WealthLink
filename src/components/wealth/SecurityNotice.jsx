import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function SecurityNotice({ title = 'Security warning', children, tone = 'amber' }) {
  const tones = {
    amber: 'border-amber-400/20 bg-amber-400/5 text-amber-200',
    red: 'border-rose-400/20 bg-rose-400/5 text-rose-200',
    teal: 'border-teal-400/20 bg-teal-400/5 text-teal-200'
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-bold">{title}</p>
          <div className="mt-1 text-xs leading-5 opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}