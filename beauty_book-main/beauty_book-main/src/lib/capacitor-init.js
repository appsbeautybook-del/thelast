import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';

export function initCapacitor() {
  const isNative = !!window.Capacitor;

  if (!isNative) return;

  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});

  Keyboard.addListener('keyboardWillShow', (info) => {
    document.body.style.paddingBottom = `${info.keyboardHeight}px`;
  }).catch(() => {});

  Keyboard.addListener('keyboardWillHide', () => {
    document.body.style.paddingBottom = '0px';
  }).catch(() => {});

  SplashScreen.hide().catch(() => {});

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.minimizeApp();
    }
  }).catch(() => {});

  // Handle OAuth callback via deep link
  App.addListener('appUrlOpen', async (event) => {
    const url = event.url;
    if (!url) return;

    console.log('[OAuth] appUrlOpen:', url);

    // Fermer le navigateur
    await Browser.close().catch(() => {});

    // Parser les tokens depuis le hash ou les query params
    let tokenString = '';
    if (url.includes('#')) {
      tokenString = url.split('#')[1];
    } else if (url.includes('?')) {
      tokenString = url.split('?')[1];
    }

    if (!tokenString) {
      console.warn('[OAuth] No tokens in URL');
      return;
    }

    const params = new URLSearchParams(tokenString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      try {
        const { supabase } = await import('@/api/supabaseClient');
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('[OAuth] setSession error:', error);
          return;
        }

        console.log('[OAuth] Session set, navigating to home');
        localStorage.setItem('bb_onboarded', '1');
        window.location.href = '/#/';
        setTimeout(() => window.location.reload(), 500);
      } catch (e) {
        console.error('[OAuth] Failed to set session:', e);
      }
    } else {
      console.warn('[OAuth] access_token or refresh_token missing');
    }
  }).catch(() => {});
}
