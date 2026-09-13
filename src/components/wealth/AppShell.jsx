import React, { useState, useRef, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getAdminAccess } from '@/lib/adminAccess';
import { LayoutDashboard, TrendingUp, Network, WalletCards, UserRound, ShieldCheck, Settings2, Menu, X, LogOut, Bitcoin, RefreshCw } from 'lucide-react';
import Logo from '@/components/wealth/Logo';
import PullToRefresh from '@/components/wealth/PullToRefresh';

const bottomTabs = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/investments', label: 'Invest', icon: TrendingUp },
  { to: '/network', label: 'Network', icon: Network },
  { to: '/wallet', label: 'Wallet', icon: WalletCards },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

const sidebarNav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/investments', label: 'Invest', icon: TrendingUp },
  { to: '/network', label: 'My network', icon: Network },
  { to: '/wallet', label: 'Rewards & wallet', icon: WalletCards },
  { to: '/coinbase', label: 'Crypto center', icon: Bitcoin },
  { to: '/profile', label: 'Profile & KYC', icon: UserRound },
];

const adminNav = [
  { to: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { to: '/coinbase/admin', label: 'Coinbase admin', icon: Bitcoin },
  { to: '/admin', label: 'Administration', icon: Settings2 },
];

function matchTab(pathname) {
  for (const t of bottomTabs) {
    if (t.to === '/') {
      if (pathname === '/') return '/';
    } else if (pathname.startsWith(t.to)) {
      return t.to;
    }
  }
  return null;
}

function ContentSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 border-4 border-slate-700 border-t-[#d4af37] rounded-full animate-spin" />
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const tabStacks = useRef({});
  const activeTab = matchTab(location.pathname);

  const access = getAdminAccess({
    app_role: user?.app_role,
    access_level: user?.access_level,
    is_admin: user?.is_admin,
    is_super_admin: user?.is_super_admin,
  });
  const staff = access.isAdmin;
  const fullSidebarNav = [...sidebarNav, ...(staff ? adminNav : [])];
  const extraNav = [
    {to:'/coinbase',label:'Crypto center',icon:Bitcoin},
    ...(staff ? adminNav : []),
  ];

  const handleTabClick = (to) => {
    const current = location.pathname;
    const currentTab = matchTab(current);
    if (currentTab) tabStacks.current[currentTab] = current;
    if (to === activeTab) {
      tabStacks.current[to] = to;
      navigate(to);
    } else {
      const saved = tabStacks.current[to];
      if (saved && saved !== to) navigate(saved);
      else navigate(to);
    }
  };

  const handleRefresh = useCallback(async () => {
    window.dispatchEvent(new CustomEvent('wealthlink:refresh'));
    await new Promise((r) => setTimeout(r, 600));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e14] text-slate-100">
      {/* Mobile header */}
      <header
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#0b1525]/95 px-4 backdrop-blur lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(4rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <Brand />
          <RefreshButton />
        </div>
        {extraNav.length > 0 && (
          <button onClick={() => setOpen(!open)} className="rounded-xl border border-white/10 p-2">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </header>

      {/* Mobile dropdown menu for extra nav items */}
      {open && extraNav.length > 0 && (
        <div
          className="fixed inset-x-0 z-30 border-b border-white/10 bg-[#0b1525] p-3 shadow-xl lg:hidden"
          style={{ top: 'calc(4rem + env(safe-area-inset-top))' }}
        >
          {extraNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({isActive}) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${isActive?'bg-[#c5a059]/10 text-[#d4af37]':'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
          <button onClick={() => logout()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" /> Secure sign out
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-[#0b1525] p-5 lg:block">
        <div className="flex items-center justify-between">
          <Brand />
          <RefreshButton />
        </div>
        <div className="mt-9 rounded-2xl border border-[#c5a059]/15 bg-[#c5a059]/5 p-4">
          <p className="text-xs text-slate-500">SIGNED IN AS</p>
          <p className="mt-1 truncate text-sm font-medium">{user?.full_name || user?.email}</p>
          <p className="mt-1 text-xs font-semibold text-[#d4af37]">{(user?.app_role || 'MEMBER').replaceAll('_',' ')}</p>
        </div>
        <nav className="mt-7 space-y-1">
          {fullSidebarNav.map(({to,label,icon:Icon}) => (
            <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${isActive?'bg-[#c5a059]/10 text-[#d4af37]':'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => logout()} className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" /> Secure sign out
        </button>
      </aside>

      {/* Main content */}
      <main
        className="min-h-screen pt-20 lg:ml-72 lg:pt-0"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-7xl p-5 sm:p-7 lg:p-9">
          <PullToRefresh onRefresh={handleRefresh}>
            <Suspense fallback={<ContentSpinner />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </PullToRefresh>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-[#0b1525]/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomTabs.map(({ to, label, icon: Icon }) => {
          const isActive = activeTab === to;
          return (
            <button key={to} type="button" onClick={() => handleTabClick(to)} className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition ${isActive?'text-[#d4af37]':'text-slate-500'}`}>
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Logo className="h-10 w-10" />
      <div>
        <p className="text-sm font-bold tracking-[.14em] text-white">WEALTHLINK</p>
        <p className="text-xs tracking-[.22em] text-slate-500">PARTNER NETWORK</p>
      </div>
    </div>
  );
}

function RefreshButton() {
  const [spinning, setSpinning] = useState(false);
  const handleRefresh = () => {
    setSpinning(true);
    window.location.reload();
  };
  return (
    <button
      onClick={handleRefresh}
      title="Refresh page"
      className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-[#d4af37]"
    >
      <RefreshCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
    </button>
  );
}