import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function RetryNotice({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-6 text-center">
      <p className="text-sm text-rose-200">{message}</p>
      <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-400/10 text-rose-200 text-sm font-medium hover:bg-rose-400/20 transition-colors">
        <RefreshCw className="w-3.5 h-3.5" /> Try again
      </button>
    </div>
  );
}