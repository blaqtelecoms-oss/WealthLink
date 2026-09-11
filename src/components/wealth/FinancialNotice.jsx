import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function FinancialNotice({ children }) {
  return <div className="flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100/80"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"/><p>{children}</p></div>;
}