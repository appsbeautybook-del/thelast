import { supabase } from '@/api/supabaseClient';
import { startSocialAuth } from '@/lib/socialAuth';
export function isNativeApp() { return Boolean(window.Capacitor?.isNativePlatform?.()); }
export async function signInWithOAuthWeb(provider) {
  return startSocialAuth(supabase, provider, { origin: window.location.origin, storage: sessionStorage, redirect: url => window.location.assign(url) });
}
export const signInWithOAuthMobile = signInWithOAuthWeb;
