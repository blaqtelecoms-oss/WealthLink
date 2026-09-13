import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getAdminAccess } from '@/lib/adminAccess';

const AuthContext = createContext();

const getUserProfile = async (authUser) => {
  if (!authUser?.id) return {};

  const queries = [
    () => supabase.from('"User"').select('*').eq('auth_user_id', authUser.id).maybeSingle(),
    () => supabase.from('"User"').select('*').eq('id', authUser.id).maybeSingle(),
  ];

  for (const runQuery of queries) {
    const { data, error } = await runQuery();

    if (error && error.code !== 'PGRST116') {
      console.warn('Unable to load user profile role metadata:', error.message);
      return {};
    }

    if (data) {
      return data;
    }
  }

  return {};
};

const hydrateUser = async (authUser) => {
  if (!authUser) return null;

  const profile = await getUserProfile(authUser);
  const metadata = authUser.user_metadata || {};

  let isAdminData = false;
  let isSuperAdminData = false;

  try {
    const [adminResult, superAdminResult] = await Promise.all([
      supabase.rpc('is_admin'),
      supabase.rpc('is_super_admin'),
    ]);

    if (adminResult.error) {
      console.warn('Unable to resolve admin access:', adminResult.error.message);
    } else {
      isAdminData = Boolean(adminResult.data);
    }

    if (superAdminResult.error) {
      console.warn('Unable to resolve super-admin access:', superAdminResult.error.message);
    } else {
      isSuperAdminData = Boolean(superAdminResult.data);
    }
  } catch (error) {
    console.warn('Admin access RPC lookup failed:', error?.message || error);
  }

  const adminAccess = getAdminAccess({
    app_role: profile?.app_role || metadata.app_role || 'MEMBER',
    access_level: profile?.access_level || metadata.access_level,
    is_admin: isAdminData,
    is_super_admin: isSuperAdminData,
  });

  return {
    id: authUser.id,
    email: authUser.email,
    auth_user_id: profile?.auth_user_id || authUser.id,
    ...metadata,
    ...profile,
    role: profile?.role || metadata.role || 'user',
    app_role: profile?.app_role || metadata.app_role || 'MEMBER',
    access_level: adminAccess.accessLevel,
    is_admin: adminAccess.isAdmin,
    is_super_admin: adminAccess.isSuperAdmin,
    admin_access_level: adminAccess.accessLevel,
    status: profile?.status || metadata.status || 'ACTIVE',
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAppState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const hydratedUser = await hydrateUser(session.user);
        setUser(hydratedUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setAuthChecked(true);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);
      await checkUserAuth();
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        const hydratedUser = await hydrateUser(session.user);
        setUser(hydratedUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut failed:', err);
    }

    if (shouldRedirect) {
      window.location.href = '/login';
      return;
    }

  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};