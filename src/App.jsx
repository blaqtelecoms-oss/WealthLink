import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/wealth/AppShell';
import RoleGate from '@/components/wealth/RoleGate';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Investments = lazy(() => import('@/pages/Investments'));
const Network = lazy(() => import('@/pages/Network'));
const Wallet = lazy(() => import('@/pages/Wallet'));
const Profile = lazy(() => import('@/pages/Profile'));
const Compliance = lazy(() => import('@/pages/Compliance'));
const Admin = lazy(() => import('@/pages/Admin'));
const AdminMemberPortal = lazy(() => import('@/pages/AdminMemberPortal'));
const CoinbaseCenter = lazy(() => import('@/pages/CoinbaseCenter'));
const CoinbaseAdmin = lazy(() => import('@/pages/CoinbaseAdmin'));
const OnboardingWizard = lazy(() => import('@/pages/OnboardingWizard'));

function PageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0e14]">
      <div className="h-8 w-8 border-4 border-slate-700 border-t-[#d4af37] rounded-full animate-spin" />
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/welcome" element={<OnboardingWizard />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/network" element={<Network />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/coinbase" element={<CoinbaseCenter />} />
            <Route element={<RoleGate roles={['FINANCE_ADMIN','ADMIN','SUPER_ADMIN','COMPLIANCE_OFFICER']} />}>
              <Route path="/coinbase/admin" element={<CoinbaseAdmin />} />
            </Route>
            <Route element={<RoleGate roles={['COMPLIANCE_OFFICER','ADMIN','SUPER_ADMIN']} />}>
              <Route path="/compliance" element={<Compliance />} />
            </Route>
            <Route element={<RoleGate roles={['SUPPORT','FINANCE_ADMIN','ADMIN','SUPER_ADMIN']} />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/member/:memberId" element={<AdminMemberPortal />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
}


function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App