import { supabase } from '@/api/supabaseClient';

export function isNativeApp() {
  return false;
}

export async function signInWithOAuthMobile(provider) {
  // Désactivé - utiliser uniquement le flow web
  return signInWithOAuthWeb(provider);
}

export async function signInWithOAuthWeb(provider) {
  const redirectTo = window.location.origin + '/auth/callback';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    console.error(`[OAuth] ${provider} error:`, error.message);
    if (error.message?.includes('provider') || error.message?.includes('not enabled')) {
      throw new Error(`Le provider ${provider === 'google' ? 'Google' : 'Apple'} n'est pas activé. Activez-le dans le dashboard Supabase > Authentication > Providers.`);
    }
    throw error;
  }
}
