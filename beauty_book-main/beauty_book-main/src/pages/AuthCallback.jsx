import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Connexion en cours...');

  useEffect(() => {
    let done = false;

    const handleUserAuth = async (user) => {
      if (done) return;
      setStatus('Vérification du compte...');
      console.log('[AuthCallback] User authentifié:', user.email, user.id);

      let profile = null;

      const { data: profileById, error: errorById } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileById) {
        profile = profileById;
      } else {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', user.email)
          .maybeSingle();

        if (profileByEmail) {
          profile = profileByEmail;
        }
      }

      console.log('[AuthCallback] Profile trouvé:', !!profile, '| Erreur ID:', errorById?.message);

      if (done) return;

      if (profile) {
        console.log('[AuthCallback] → Accueil (compte existant)');
        localStorage.setItem('bb_onboarded', '1');
        done = true;
        navigate('/', { replace: true });
      } else {
        const fromSignup = sessionStorage.getItem('bb_social_signup');

        if (fromSignup) {
          console.log('[AuthCallback] → Accueil (inscription Google)');
          const { error: insertError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

          if (insertError) console.error('[AuthCallback] Profile insert error:', insertError);

          localStorage.setItem('bb_onboarded', '1');
          sessionStorage.removeItem('bb_social_signup');
          done = true;
          navigate('/', { replace: true });
        } else {
          console.log('[AuthCallback] → Accueil (nouveau profil)');
          const { error: insertError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

          if (insertError) console.error('[AuthCallback] Profile insert error:', insertError);

          localStorage.setItem('bb_onboarded', '1');
          done = true;
          navigate('/', { replace: true });
        }
      }
    };

    // ── 1) Listener onAuthStateChange — se déclenche quand Supabase traite le token ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthCallback] onAuthStateChange:', event, !!session?.user);
      if (session?.user && !done) {
        await handleUserAuth(session.user);
      }
    });

    // ── 2) Vérification initiale immédiate ──
    const tryGetSession = async () => {
      try {
        // Attendre que les tokens dans le hash soient traités
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          await new Promise(r => setTimeout(r, 1500));
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (done) return;

        if (error) {
          console.error('[AuthCallback] getSession error:', error);
        }

        if (session?.user) {
          await handleUserAuth(session.user);
          return;
        }

        // Fallback: getUser
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (user && !userError) {
          await handleUserAuth(user);
        }
      } catch (e) {
        console.error('[AuthCallback] tryGetSession error:', e);
      }
    };

    tryGetSession();

    // ── 3) Timeout de sécurité → si rien ne marche, retour à connexion ──
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        console.warn('[AuthCallback] Timeout — redirection vers /connexion');
        navigate('/connexion', { replace: true });
      }
    }, 30000);

    return () => {
      done = true;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-display">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-[#E8732A] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-[14px] font-medium">{status}</p>
      </div>
    </div>
  );
}
