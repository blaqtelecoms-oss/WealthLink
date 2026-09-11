import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function RoleGate({ roles }) {
  const { user } = useAuth();
  if (user?.role === 'admin' || roles.includes(user?.app_role)) return <Outlet />;
  return <Navigate to="/" replace />;
}