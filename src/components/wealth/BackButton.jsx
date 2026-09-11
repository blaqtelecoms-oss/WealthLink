import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function BackButton({ to = '/', label = 'Back' }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-3 py-1.5 text-sm text-slate-400 transition hover:bg-white/[.06] hover:text-white"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}