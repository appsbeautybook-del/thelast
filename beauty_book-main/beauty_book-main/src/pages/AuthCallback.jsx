import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Connexion en cours...');

  useEffect(() => {
    let done = false;

    const handleCallback = async () => {
      if (done) return;

      try {
        // Attendre que les tokens dans le hash soient traités
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          await new Promise(r => setTimeout(r, 2500));
        }

        // Forcer la récupération de la session pour s'assurer qu'elle est à jour
        const { data: { session }, error } = await supabase.auth.getSession();

        if (done) return;

        if (error) {
          console.error('[AuthCallback] getSession error:', error);
          setStatus('Erreur de connexion. Redirection...');
          setTimeout(() => { if (!done) navigate('/connexion', { replace: true }); }, 1500);
          return;
        }

        if (!session?.user) {
          // Pas de session → essayer avec getUser
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.error('[AuthCallback] No user found:', userError);
            setStatus('Aucune session trouvée. Redirection...');
            setTimeout(() => { if (!done) navigate('/connexion', { replace: true }); }, 1500);
            return;
          }
          // Utiliser le user trouvé par getUser
          await handleUserAuth(user);
          return;
        }

        await handleUserAuth(session.user);

      } catch (e) {
        console.error('[AuthCallback] error:', e);
        if (!done) navigate('/connexion', { replace: true });
      }
    };

    const handleUserAuth = async (user) => {
      setStatus('Vérification du compte...');
      console.log('[AuthCallback] User authentifié:', user.email, user.id);

      // Vérifier si le profil existe dans la table profiles (par ID ET par email)
      let profile = null;

      // Méthode 1: par ID
      const { data: profileById, error: errorById } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileById) {
        profile = profileById;
      } else {
        // Méthode 2: par email (au cas où l'ID ne matche pas)
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
        // COMPTE EXISTANT → Accueil
        console.log('[AuthCallback] → Redirection vers accueil');
        localStorage.setItem('bb_onboarded', '1');
        navigate('/', { replace: true });
      } else {
        // PAS DE PROFIL → Vérifier la source
        const fromSignup = sessionStorage.getItem('bb_social_signup');

        if (fromSignup) {
          // Vient de l'onboarding → créer le profil et aller directement à l'accueil
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

          if (insertError) {
            console.error('[AuthCallback] Profile insert error:', insertError);
          }

          localStorage.setItem('bb_onboarded', '1');
          sessionStorage.removeItem('bb_social_signup');
          navigate('/', { replace: true });
        } else {
          // Vient de la connexion → le compte n'existe pas encore dans profiles
          // MAIS l'utilisateur a un compte Supabase Auth → créer le profil et aller à l'accueil
          console.log('[AuthCallback] → Nouveau profil, création automatique');

          const { error: insertError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

          if (insertError) {
            console.error('[AuthCallback] Profile insert error:', insertError);
          }

          localStorage.setItem('bb_onboarded', '1');
          navigate('/', { replace: true });
        }
      }
    };

    handleCallback();

    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        navigate('/connexion', { replace: true });
      }
    }, 15000);

    return () => {
      done = true;
      clearTimeout(timeout);
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
