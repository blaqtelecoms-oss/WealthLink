import React from "react";
import Logo from "@/components/wealth/Logo";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children, wide = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e14] px-4 py-10 text-slate-100">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="text-center mb-10">
          <Logo className="h-20 w-20 mx-auto mb-4" />
          <p className="mb-5 text-xs font-bold tracking-[.22em] text-[#d4af37]">WEALTHLINK PARTNER NETWORK</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}