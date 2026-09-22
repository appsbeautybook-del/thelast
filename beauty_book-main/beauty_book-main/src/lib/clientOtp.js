import { supabase } from '@/api/supabaseClient';

export async function clientSendVerificationCode(email) {
  if (typeof email !== 'string' || !email.includes('@')) throw new Error('Adresse email invalide.');
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw error;
  return { success: true, method: 'supabase' };
}

export async function clientVerifyCode(email, code) {
  const cleanEmail = email.trim();
  const cleanCode = String(code).trim();
  
  let { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: 'signup' });
  if (error || !data?.session) {
    const retry = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: 'email' });
    if (!retry.error && retry.data?.session) {
      data = retry.data;
      error = null;
    }
  }

  if (error || !data?.session) return { valid: false, error: error?.message || 'Code incorrect ou expiré.' };
  return { valid: true, session: data.session };
}

