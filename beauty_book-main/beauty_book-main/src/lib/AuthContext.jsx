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
  const profileRequest = useRef(0);
  const loadProfile = async (userId) => {
    const request = ++profileRequest.current;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (request === profileRequest.current && activeUser.current === userId) setProfile(data || null);
      return data;
    } catch {
      if (request === profileRequest.current && activeUser.current === userId) setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    let disposed = false;
    let eventReceived = false;
    // Supabase dispatches auth events under its session lock. Database calls run in a separate effect.
    const applySession = (session) => {
      if (disposed) return;
      const next = session?.user || null;
      if (activeUser.current !== next?.id) { ++profileRequest.current; setProfile(null); }
      activeUser.current = next?.id || null;
      setUser(next); setIsAuthenticated(Boolean(next));
      setAuthError(null); setIsLoadingAuth(false); setAuthChecked(true);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      eventReceived = true; applySession(session);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (disposed || eventReceived) return;
      if (error) throw error;
      applySession(data?.session);
    }).catch(() => {
      if (!disposed && !eventReceived) {
        applySession(null); setAuthError({ type: 'session_unavailable', message: 'Session indisponible. Reconnectez-vous.' });
      }
    });
    return () => { disposed = true; activeUser.current = null; ++profileRequest.current; subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (user?.id) void loadProfile(user.id); }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !user.email || !profile?.id || profile.email === user.email) return;
    void supabase.from('profiles').update({ email: user.email, updated_at: new Date().toISOString() }).eq('id', user.id);
  }, [user?.id, user?.email, profile?.id, profile?.email]);

  const logout = async (shouldRedirect = true) => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('La déconnexion a échoué. Réessayez.');
    activeUser.current = null; ++profileRequest.current;
    setUser(null); setProfile(null); setIsAuthenticated(false);
    for (const key of ['bb_is_pro', 'bb_onboarded', 'pro_profile_cache']) localStorage.removeItem(key);
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('bb_')) sessionStorage.removeItem(key);
    if (shouldRedirect) window.location.href = '/';
  };

  const navigateToLogin = () => {
    window.location.href = '/connexion';
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
