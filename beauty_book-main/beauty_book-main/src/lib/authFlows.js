const DRAFT_KEY = 'bb_signup_data';
const draftFields = ['prenom', 'nom', 'email', 'phone', 'mode', 'gender', 'interests'];

export function saveSignupDraft(storage, input) {
  const draft = Object.fromEntries(draftFields.filter(key => input[key] !== undefined).map(key => [key, input[key]]));
  storage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return draft;
}

export function readSignupDraft(storage) {
  try {
    const draft = JSON.parse(storage.getItem(DRAFT_KEY) || '{}');
    return saveSignupDraft(storage, draft && typeof draft === 'object' ? draft : {});
  } catch { storage.removeItem(DRAFT_KEY); return {}; }
}

export function strongPassword(password) {
  return typeof password === 'string' && password.length >= 8 &&
    [/[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(pattern => pattern.test(password)).length >= 2;
}

export function normalizeUsername(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
}

export function usernameCandidates(value) {
  const base = normalizeUsername(value) || 'beautybook';
  const candidates = [base, `${base}_beauty`, `${base}_bb`, `${base}2026`, `${base}_officiel`];
  return [...new Set(candidates.map(normalizeUsername).filter(candidate => candidate.length >= 3))];
}

async function findAvailableUsername(client, value, userId = null) {
  const candidates = usernameCandidates(value);
  const { data, error } = await client.from('profiles').select('id, username').not('username', 'is', null).limit(1000);
  if (error) throw new Error('Impossible de vérifier le nom d’utilisateur.');
  const used = new Set((data || []).filter(row => row.id !== userId).map(row => normalizeUsername(row.username)));
  const available = candidates.filter(candidate => !used.has(candidate));
  if (available[0]) return available[0];
  for (let i = 1; i < 100; i += 1) {
    const candidate = normalizeUsername(`${candidates[0]}_${i}`);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error('Aucun nom d’utilisateur disponible.');
}

export function createAuthFlows(client) {
  async function ensureProfile(user) {
    if (!user?.id) throw new Error('Votre session a expiré. Reconnectez-vous.');
    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw new Error('Impossible de charger votre profil. Réessayez.');
    if (data) {
      if (data.username) return data;
      const username = await findAvailableUsername(client, user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0], user.id);
      const updated = await client.from('profiles').update({ username, updated_at: new Date().toISOString() }).eq('id', user.id).select('*').single();
      return updated.error ? data : updated.data;
    }
    const username = await findAvailableUsername(client, user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0], user.id);
    const record = { id: user.id, email: user.email, role: 'user', username,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '' };
    const result = await client.from('profiles').insert(record).select('*').single();
    if (result.error?.code === '23505') {
      const existing = await client.from('profiles').select('*').eq('id', user.id).single();
      if (!existing.error && existing.data) return existing.data;
    }
    if (result.error || !result.data) throw new Error('Votre profil n’a pas pu être enregistré. Réessayez.');
    return result.data;
  }

  async function signup(form, storage, redirectTo) {
    if (!strongPassword(form.password)) throw new Error('Utilisez au moins 8 caractères et deux types de caractères parmi majuscules, chiffres et symboles.');
    const email = form.email.trim();
    const { data, error } = await client.auth.signUp({ email, password: form.password,
      options: { emailRedirectTo: redirectTo, data: { full_name: [form.prenom.trim(), form.nom.trim()].join(' ') } } });
    if (error) throw error;
    if (data?.user?.identities?.length === 0) throw new Error('Un compte existe déjà. Connectez-vous ou réinitialisez votre mot de passe.');
    saveSignupDraft(storage, { prenom: form.prenom.trim(), nom: form.nom.trim(), email, mode: 'email' });
    if (data?.session?.user) await ensureProfile(data.session.user);
    return { verified: Boolean(data?.session?.user) };
  }

  async function verifySignup(draft, code) {
    const params = draft.mode === 'phone' ? { phone: draft.phone, type: 'sms' } : { email: draft.email, type: 'email' };
    if (!(params.email || params.phone)) throw new Error('Coordonnées introuvables. Reprenez votre inscription.');
    const { data, error } = await client.auth.verifyOtp({ ...params, token: code });
    if (error) throw new Error('Code incorrect ou expiré. Demandez un nouveau code.');
    if (!data?.session?.user) throw new Error('La vérification n’a pas ouvert de session. Reconnectez-vous.');
    await ensureProfile(data.session.user);
    return data.session;
  }

  async function resendSignup(draft, redirectTo) {
    if (!draft.email && !draft.phone) throw new Error('Coordonnées introuvables. Reprenez votre inscription.');
    const result = draft.mode === 'phone'
      ? await client.auth.signInWithOtp({ phone: draft.phone, options: { shouldCreateUser: false } })
      : await client.auth.resend({ type: 'signup', email: draft.email, options: { emailRedirectTo: redirectTo } });
    if (result.error) throw new Error('Le message n’a pas pu être envoyé. Réessayez dans un instant.');
  }
  return { ensureProfile, signup, verifySignup, resendSignup };
}
