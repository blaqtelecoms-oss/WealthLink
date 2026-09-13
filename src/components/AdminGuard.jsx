import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { verifyAdminAccess } from '@/lib/adminAuth';
import { AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * AdminGuard - Protects admin routes and verifies access via AdminAllowlist
 */
export function AdminGuard({ children, requiredLevel = 'ADMIN' }) {
  const { user, isLoadingAuth } = useAuth();
  const [adminAccess, setAdminAccess] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.id) {
        setIsVerifying(false);
        setAdminAccess(null);
        return;
      }

      try {
        setError(null);
        const access = await verifyAdminAccess(user.id);
        setAdminAccess(access);

        if (!access.isAdmin) {
          setError('Insufficient permissions. Admin access required.');
        }
      } catch (err) {
        setError('Failed to verify admin access.');
        console.error('Admin verification error:', err);
      } finally {
        setIsVerifying(false);
      }
    };

    checkAdminAccess();
  }, [user?.id]);

  if (isLoadingAuth || isVerifying) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-teal-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-white">Authentication required</h2>
              <p className="mt-2 text-sm text-slate-400">You must be logged in to access admin features.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !adminAccess?.isAdmin) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 max-w-md">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-white">Access denied</h2>
              <p className="mt-2 text-sm text-slate-400">
                {error || 'You do not have permission to access this page. Admin access is required.'}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Access level: {adminAccess?.accessLevel || 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminGuard;
