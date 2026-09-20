import './env.js';
import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/errors.js';
const authOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
let admin;
export function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new HttpError(503, 'BACKEND_NOT_CONFIGURED', 'Le backend Supabase n’est pas configuré.');
  admin ||= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: authOptions });
  return admin;
}
// A service-role client never falls back to a public key and never handles sign-in.
export const supabaseAdmin = new Proxy({}, { get: (_, key) => {
  const client = getSupabaseAdmin();
  return typeof client[key] === 'function' ? client[key].bind(client) : client[key];
} });
export function userSupabase(token) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
    throw new HttpError(503, 'BACKEND_NOT_CONFIGURED', 'Le backend Supabase n’est pas configuré.');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: authOptions, global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}

