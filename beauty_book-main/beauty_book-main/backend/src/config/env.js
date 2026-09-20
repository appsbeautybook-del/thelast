import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
export function missingConfiguration(env = process.env) {
  return ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'].filter(key => !env[key]);
}
export function allowedOrigins(env = process.env) {
  const configured = (env.ALLOWED_ORIGINS || env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
  return new Set([...configured, ...(env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']), 'capacitor://localhost', 'https://localhost']);
}
