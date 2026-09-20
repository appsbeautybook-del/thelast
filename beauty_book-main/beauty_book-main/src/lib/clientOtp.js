import { supabase } from '@/api/supabaseClient';
export async function clientSendVerificationCode(email) {
  if (typeof email !== 'string' || !email.includes('@')) throw new Error('Adresse email invalide.');
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
  if (error) throw error;
  return { success: true, method: 'supabase' };
}
export async function clientVerifyCode(email, code) {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: String(code).trim(), type: 'email' });
  if (error || !data?.session) return { valid: false, error: error?.message || 'Code incorrect ou expiré.' };
  return { valid: true };
}
