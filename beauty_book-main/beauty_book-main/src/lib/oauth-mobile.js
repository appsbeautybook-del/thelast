import { supabase } from '@/api/supabaseClient';

const APP_SCHEME = 'com.appsbeautybook.app';

export function isNativeApp() {
  return !!(window.Capacitor);
}

export function getRedirectUrl() {
  if (isNativeApp()) {
    return APP_SCHEME + '://auth/callback';
  }
  return window.location.origin + '/auth/callback';
}

export async function signInWithOAuthMobile(provider) {
  const redirectTo = getRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (data?.url) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url, presentationStyle: 'popover' });

    // Attendre 5s avant de poller pour laisser le temps à l'utilisateur de sélectionner un compte
    await new Promise(r => setTimeout(r, 5000));

    const poll = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          clearInterval(poll);
          await Browser.close().catch(() => {});
          window.location.href = '/#/';
          setTimeout(() => window.location.reload(), 300);
        }
      } catch (e) {
        console.warn('[OAuth] Poll error:', e);
      }
    }, 3000);

    setTimeout(() => clearInterval(poll), 120000);
  }
}

export async function signInWithOAuthWeb(provider) {
  const redirectTo = getRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    console.error(`[OAuth] ${provider} error:`, error.message);
    // Messages d'erreur clairs pour chaque provider
    if (error.message?.includes('provider') || error.message?.includes('not enabled')) {
      throw new Error(`Le provider ${provider === 'google' ? 'Google' : 'Apple'} n'est pas activé. Activez-le dans le dashboard Supabase > Authentication > Providers.`);
    }
    throw error;
  }
}
