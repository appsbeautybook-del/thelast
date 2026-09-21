export function authMessage(error) {
  const messages = {
    invalid_credentials: 'Adresse email ou mot de passe incorrect.',
    email_not_confirmed: 'Confirmez votre adresse email pour continuer.',
    user_already_exists: 'Un compte existe déjà pour cette adresse. Connectez-vous ou réinitialisez votre mot de passe.',
    email_exists: 'Un compte existe déjà pour cette adresse. Connectez-vous ou réinitialisez votre mot de passe.',
    otp_expired: 'Ce code est incorrect ou a expiré. Vous pouvez en demander un nouveau.',
    over_email_send_rate_limit: 'Un email vient déjà d’être envoyé. Patientez une minute avant de réessayer.',
    over_request_rate_limit: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
    weak_password: 'Choisissez un mot de passe plus fort, avec au moins 12 caractères.',
    signup_disabled: 'Les nouvelles inscriptions sont désactivées. Contactez le support BeautyBook.',
    email_address_invalid: 'Vérifiez votre adresse email.',
    email_address_not_authorized: 'Le service email doit être activé pour envoyer des confirmations à cette adresse. Contactez le responsable BeautyBook.',
  };
  if (messages[error?.code]) return messages[error.code];
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) return 'Connexion impossible. Vérifiez votre connexion et réessayez.';
  return error?.message || 'L’opération a échoué. Réessayez.';
}

export async function createAccount(client, { email, password, redirectTo }) {
  const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
  if (!data?.user && !data?.session) throw new Error('L’inscription n’a pas abouti. Réessayez.');
  // Supabase can deliberately return an obfuscated account for an existing address.
  if (!data?.session && data?.user?.identities?.length === 0) return { status: 'existing' };
  return { status: data?.session ? 'authenticated' : 'confirmation', session: data?.session };
}

export async function confirmAccount(client, email, token) {
  const clean = String(token ?? '').replace(/\s/g, '');
  if (!/^\d{6,10}$/.test(clean)) throw new Error('Saisissez les 6 à 10 chiffres du code reçu par email.');

  const attempts = [
    { email: email.trim(), token: clean, type: 'signup' },
    { email: email.trim(), token: clean, type: 'email' },
  ];

  let lastError = null;
  for (const payload of attempts) {
    const { data, error } = await client.auth.verifyOtp(payload);
    if (!error && data?.session) return data.session;
    lastError = error;
  }

  if (lastError) throw lastError;
  throw new Error('La confirmation n’a pas ouvert de session. Reconnectez-vous.');
}

export async function resendConfirmation(client, email, redirectTo) {
  const attempts = [
    { type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo } },
    { type: 'email', email: email.trim(), options: { emailRedirectTo: redirectTo } },
  ];

  let lastError = null;
  for (const payload of attempts) {
    const { error } = await client.auth.resend(payload);
    if (!error) return;
    lastError = error;
  }

  if (lastError) throw lastError;
}

export function savePendingEmail(storage, key, email) {
  try { storage.setItem(key, JSON.stringify({ email: email.trim(), at: Date.now() })); } catch { /* private browsing */ }
}
export function pendingEmail(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key));
    return value && typeof value.email === 'string' && Date.now() - value.at < 86400000 ? value.email : '';
  } catch { return ''; }
}
