import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { getSocialProviders, startSocialAuth } from '@/lib/socialAuth';

function GoogleMark() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.89-1.74 2.99-4.3 2.99-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.22-2.51c-.89.6-2.03.96-3.39.96-2.61 0-4.82-1.76-5.61-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.31.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.32-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.32 2.59A5.99 5.99 0 0 1 12 5.96Z"/></svg>;
}
function AppleMark() {
  return <svg aria-hidden="true" width="20" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.54c.02 3.25 2.85 4.33 2.88 4.34-.02.08-.45 1.54-1.49 3.05-.9 1.31-1.83 2.62-3.3 2.65-1.43.03-1.9-.85-3.54-.85-1.64 0-2.16.82-3.51.88-1.41.05-2.49-1.43-3.39-2.73-1.84-2.66-3.24-7.51-1.36-10.8a5.26 5.26 0 0 1 4.44-2.7c1.38-.03 2.69.94 3.54.94.85 0 2.44-1.16 4.11-.99.7.03 2.67.28 3.94 2.13-.1.06-2.35 1.37-2.32 4.08ZM14.36 4.55C15.1 3.65 15.6 2.4 15.47 1.15c-1.07.04-2.38.71-3.15 1.61-.69.8-1.3 2.08-1.13 3.3 1.19.1 2.4-.6 3.17-1.51Z"/></svg>;
}
export default function SocialAuthButtons({ mode = 'login', beforeStart, disabled = false }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [providers, setProviders] = useState(null);
  useEffect(() => {
    let active = true;
    getSocialProviders(supabase).then(value => { if (active) setProviders(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  async function begin(provider) {
    if (busy || disabled) return;
    setError('');
    if (beforeStart && !beforeStart()) return;
    setBusy(provider);
    try {
      await startSocialAuth(supabase, provider, { mode, origin: window.location.origin, storage: sessionStorage,
        redirect: url => window.location.assign(url) });
    } catch (error) { setError(error.message); setBusy(''); }
  }
  return <div className="space-y-5" aria-label="Connexion avec un compte existant">
    <div className="flex items-center gap-4 py-2 text-[18px] text-[#617089]"><span className="h-px flex-1 bg-[#d9dee5]" />ou continuer avec<span className="h-px flex-1 bg-[#d9dee5]" /></div>
    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
      <button type="button" onClick={() => begin('google')} disabled={disabled || Boolean(busy)}
        className="min-h-[78px] rounded-[18px] border border-[#dfe4eb] bg-white px-3 py-3 text-[20px] font-bold text-[#14213d] flex items-center justify-center gap-3 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-60 transition-colors">
        {busy === 'google' ? <LoaderCircle size={19} className="animate-spin" /> : <GoogleMark />}<span>Avec Google</span>
      </button>
      <button type="button" onClick={() => begin('apple')} disabled={disabled || Boolean(busy)}
        className="min-h-[78px] rounded-[18px] border border-[#111827] bg-[#111827] px-3 py-3 text-[20px] font-bold text-white flex items-center justify-center gap-3 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-60 transition-colors">
        {busy === 'apple' ? <LoaderCircle size={19} className="animate-spin" /> : <AppleMark />}<span>Avec Apple</span>
      </button>
    </div>
    {providers?.apple === false && !error && <p className="text-[18px] text-[#617089] text-center">Apple sera disponible prochainement.</p>}
    {busy && <p role="status" className="text-xs text-gray-600 text-center">Ouverture de {busy === 'google' ? 'Google' : 'Apple'}…</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div>;
}
