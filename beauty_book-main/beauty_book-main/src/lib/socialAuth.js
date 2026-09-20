export const OAUTH_INTENT_KEY = 'bb_oauth_intent';
export const OAUTH_INTENT_TTL = 30 * 60 * 1000;
export function readOAuthIntent(storage, now = Date.now()) {
  try {
    const intent = JSON.parse(storage.getItem(OAUTH_INTENT_KEY) || 'null');
    if (!intent || !['google','apple'].includes(intent.provider) || !['login','signup'].includes(intent.mode) ||
      !Number.isFinite(intent.createdAt) || now < intent.createdAt || now - intent.createdAt > OAUTH_INTENT_TTL) return null;
    return intent;
  } catch { return null; }
}

export async function getSocialProviders(client, fetchImpl = fetch) {
  const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10000) : undefined;
  const response = await fetchImpl(client.supabaseUrl + '/auth/v1/settings', {
    headers: { apikey: client.supabaseKey }, ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error('Connexion indisponible. Réessayez dans un instant.');
  const settings = await response.json();
  return { google: settings.external?.google === true, apple: settings.external?.apple === true };
}

export async function startSocialAuth(client, provider, { mode = 'login', origin, storage, redirect, fetchImpl } = {}) {
  if (!['google','apple'].includes(provider)) throw new Error('Connexion non prise en charge.');
  const providers = await getSocialProviders(client, fetchImpl);
  if (!providers[provider]) throw new Error(`La connexion avec ${provider === 'google' ? 'Google' : 'Apple'} n’est pas encore disponible. Vous pouvez continuer avec votre email.`);
  const callback = new URL('/auth/callback', origin);
  if (!['http:', 'https:'].includes(callback.protocol)) throw new Error('Cette connexion doit être ouverte depuis le site BeautyBook.');
  // Supabase validates the OAuth state and session. This marker only selects the onboarding screen.
  storage.setItem(OAUTH_INTENT_KEY, JSON.stringify({ provider, mode, createdAt: Date.now() }));
  const { data, error } = await client.auth.signInWithOAuth({ provider, options: {
    redirectTo: callback.href, skipBrowserRedirect: true,
    ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
  } });
  if (error || !data?.url) { storage.removeItem(OAUTH_INTENT_KEY); throw new Error('Impossible de démarrer la connexion. Réessayez.'); }
  const target = new URL(data.url);
  if (target.origin !== new URL(client.supabaseUrl).origin || target.pathname !== '/auth/v1/authorize') {
    storage.removeItem(OAUTH_INTENT_KEY); throw new Error('Adresse de connexion invalide.');
  }
  redirect(target.href);
}
