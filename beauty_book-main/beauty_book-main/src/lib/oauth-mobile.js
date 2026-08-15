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

    // Attendre que appUrlOpen handle le callback via deep link
    // Poll en arrière-plan comme filet de sécurité
    await new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 40;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            clearInterval(poll);
            await Browser.close().catch(() => {});
            window.location.href = '/#/';
            setTimeout(() => window.location.reload(), 500);
            resolve();
          }
        } catch (e) {
          console.warn('[OAuth] Poll error:', e);
        }
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          resolve();
        }
      }, 3000);
    });
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
    if (error.message?.includes('provider') || error.message?.includes('not enabled')) {
      throw new Error(`Le provider ${provider === 'google' ? 'Google' : 'Apple'} n'est pas activé. Activez-le dans le dashboard Supabase > Authentication > Providers.`);
    }
    throw error;
  }
}
