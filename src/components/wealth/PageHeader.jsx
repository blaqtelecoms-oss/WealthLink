import React from 'react';

export default function PageHeader({ eyebrow, title, description, action }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#d4af37]">{eyebrow}</p><h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}</div>{action}</div>;
}