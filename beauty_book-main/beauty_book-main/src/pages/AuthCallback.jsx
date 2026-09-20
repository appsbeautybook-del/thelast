import { readOAuthIntent, OAUTH_INTENT_KEY } from '@/lib/socialAuth';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { createAuthFlows, readSignupDraft, saveSignupDraft } from '@/lib/authFlows';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false, handling = false;
    const timers = new Set();
    const fail = message => { if (!disposed) setError(message); };
    const complete = async (user) => {
      if (disposed || handling) return;
      handling = true;
      try {
        const profile = await createAuthFlows(supabase).ensureProfile(user);
        if (disposed) return;
        const intent = readOAuthIntent(sessionStorage);
        sessionStorage.removeItem(OAUTH_INTENT_KEY);
        let draft = readSignupDraft(sessionStorage);
        const isSocialSignup = intent?.mode === 'signup';
        if (isSocialSignup && (!profile.full_name || !profile.gender)) {
          const parts = String(profile.full_name || '').trim().split(/\s+/);
          draft = saveSignupDraft(sessionStorage, { mode: 'email', email: user.email, prenom: parts[0] || '', nom: parts.slice(1).join(' ') });
          if (!profile.full_name) sessionStorage.setItem('bb_social_name_required', '1');
        } else if (intent) { sessionStorage.removeItem('bb_signup_data'); draft = {}; }
        if (isSocialSignup && draft.email && draft.email.toLowerCase() === user.email?.toLowerCase()) {
          sessionStorage.setItem('bb_social_signup', '1');
          navigate('/onboarding', { replace: true });
        } else {
          sessionStorage.removeItem('bb_social_signup');
          localStorage.setItem('bb_onboarded', '1');
          navigate('/', { replace: true });
        }
      } catch (error) { fail(error.message || 'Impossible de terminer la connexion.'); }
    };
    const params = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (params.has('error') || query.has('error')) { fail('Le fournisseur n’a pas autorisé la connexion. Réessayez.'); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const timer = setTimeout(() => { timers.delete(timer); void complete(session.user); }, 0);
        timers.add(timer);
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) fail('Le lien de connexion est invalide ou expiré.');
      else if (data?.session?.user) void complete(data.session.user);
    }).catch(() => fail('La connexion est indisponible. Réessayez.'));
    const timeout = setTimeout(() => { if (!handling) fail('Le lien de connexion est invalide ou expiré.'); }, 20000);
    return () => { disposed = true; clearTimeout(timeout); timers.forEach(clearTimeout); subscription.unsubscribe(); };
  }, [navigate]);
  return <main className="min-h-screen bg-white grid place-items-center px-6 font-display">
    <div className="text-center max-w-sm">
      {!error && <div className="w-10 h-10 border-4 border-orange-200 border-t-[#E8732A] rounded-full animate-spin mx-auto mb-4" />}
      <p role={error ? 'alert' : 'status'} className="text-gray-600 text-sm">{error || 'Connexion en cours…'}</p>
      {error && <Link className="inline-block mt-6 rounded-xl bg-orange-600 text-white px-5 py-3" to="/connexion">Retour à la connexion</Link>}
    </div>
  </main>;
}
