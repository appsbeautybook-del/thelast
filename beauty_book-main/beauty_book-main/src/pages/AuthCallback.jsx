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
      done = true;
      setStatus('Connexion réussie...');

      console.log('[AuthCallback] User:', user.email);

      // Vérifier si le profil existe
      let profile = null;
      const { data: profileById } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileById) {
        profile = profileById;
      } else {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        if (profileByEmail) profile = profileByEmail;
      }

      // Créer le profil s'il n'existe pas
      if (!profile) {
        console.log('[AuthCallback] Creating profile...');
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }

      // Toujours aller à l'accueil
      localStorage.setItem('bb_onboarded', '1');
      sessionStorage.removeItem('bb_social_signup');
      console.log('[AuthCallback] → Home');
      navigate('/', { replace: true });
    };

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthCallback] onAuthStateChange:', event, !!session?.user);
      if (session?.user && !done) {
        await handleUserAuth(session.user);
      }
    });

    // Vérifier la session immédiatement
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !done) {
        handleUserAuth(session.user);
      }
    }).catch(console.error);

    // Timeout de sécurité
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        console.warn('[AuthCallback] Timeout');
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
