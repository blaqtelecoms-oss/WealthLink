import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { canAccessRoute } from '@/lib/adminAccess';

export default function RoleGate({ roles = [], requireSuperAdmin = false }) {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    if (!user) {
      setAuthorized(false);
      return;
    }

    setAuthorized(canAccessRoute(user, roles, requireSuperAdmin));
  }, [user, roles, requireSuperAdmin]);

  if (authorized === null) {
    return <div className="fixed inset-0 flex items-center justify-center"><div className="h-8 w-8 border-4 border-slate-700 border-t-[#d4af37] rounded-full animate-spin" /></div>;
  }

  if (authorized) return <Outlet />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/" replace />;
}