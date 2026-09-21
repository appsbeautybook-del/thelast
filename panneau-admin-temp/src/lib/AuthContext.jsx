import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({ id: 'beautybook', public_settings: {} });
  const activeUser = useRef(null);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('[AuthContext] loadProfile query error:', error);
      }
      if (data && activeUser.current === userId) {
        setProfile({ ...data, _ts: Date.now() });
      }
      return data;
    } catch (e) {
      console.error('[AuthContext] loadProfile error', e);
      return null;
    }
  };

  useEffect(() => {
    let alive = true;
    let receivedEvent = false;
    const applySession = session => {
      if (!alive) return;
      activeUser.current = session?.user?.id || null;
      setUser(session?.user || null);
      setIsAuthenticated(Boolean(session?.user));
      setIsLoadingAuth(false);
      setAuthChecked(true);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        receivedEvent = true;
        applySession(session);
      }
    );
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setAuthError(error.message);
      if (!receivedEvent) applySession(data?.session);
    }).catch(() => {
      if (!alive) return;
      setAuthError('Impossible de récupérer la session. Reconnectez-vous.');
      if (!receivedEvent) applySession(null);
    });
    return () => { alive = false; activeUser.current = null; subscription.unsubscribe(); };
  }, []);

  // Supabase requests must run outside its auth event callback (which holds a lock).
  useEffect(() => {
    setProfile(null);
    if (user?.id) void loadProfile(user.id);
  }, [user?.id]);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/admin/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/admin/login';
  };

  const refreshUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      await loadProfile(currentUser.id);
    }
  };

  const enrichedUser = user ? {
    ...user,
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '',
    cover_url: profile?.cover_url || user.user_metadata?.cover_url || '',
    role: profile?.role || 'user',
    maria_name: profile?.maria_name || '',
    maria_memory: profile?.maria_memory || {},
    name: profile?.full_name || user.user_metadata?.full_name || user.email,
    username: profile?.username || '',
    bio: profile?.bio || '',
  } : null;

  return (
    <AuthContext.Provider value={{
      user: enrichedUser,
      profile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      refreshUser,
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
