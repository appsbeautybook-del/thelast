import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Eye, EyeOff, Loader2, Mail, CheckCircle } from "lucide-react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { setAdminToken } from "@/lib/adminApiClient";
import { useAuth } from "@/lib/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (authError) {
        if (authError.message?.includes('provider') || authError.message?.includes('not enabled')) {
          setError("Le provider Email n'est pas activé. Activez-le dans le dashboard Supabase > Authentication > Providers > Email.");
        } else if (authError.message?.includes('Email not confirmed') || authError.message?.includes('email not confirmed')) {
          setError("");
          sessionStorage.setItem("bb_admin_verify_email", email);
          navigate("/admin/verify?email=" + encodeURIComponent(email));
          return;
        } else if (authError.message?.includes('Invalid login credentials')) {
          setError("Identifiants invalides. Vérifiez votre email et mot de passe. Si vous n'avez pas de compte, créez-en un.");
        } else {
          setError("Erreur : " + (authError.message || "Identifiants invalides."));
        }
        setLoading(false);
        return;
      }

      let role = data.user?.user_metadata?.role;
      if (!role) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        if (profile?.role) role = profile.role;
      }
      
      if (role !== 'admin') {
        setError("Accès refusé. Vous n'êtes pas administrateur. Votre rôle: " + (role || 'aucun'));
        setLoading(false);
        return;
      }

      setAdminToken(data.session.access_token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) { setError("Entrez votre email d'abord."); return; }
    setResetLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/admin'
    });
    if (error) {
      setError("Erreur: " + error.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white text-[26px] font-black">BeautyBook</h1>
          <p className="text-gray-400 text-[13px] font-medium mt-1">Panneau d'administration</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-2 block">Adresse Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@beautybook.fr"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-4 text-[14px] outline-none focus:border-primary transition-colors placeholder:text-gray-500 mb-4"
              required
            />
            <label className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-2 block">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-4 text-[14px] outline-none focus:border-primary transition-colors placeholder:text-gray-500 pr-12"
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-500/40 rounded-xl px-4 py-3">
              <p className="text-red-400 text-[12px] font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl text-[15px] uppercase tracking-widest shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-60 mt-2"
          >
            {loading ? "Connexion..." : "Accéder →"}
          </button>
        </form>

        <div className="mt-8 text-center text-[12px] text-gray-500">
          <p className="mb-2">Pas encore de compte ?{" "}
          <Link to="/admin/signup" className="text-primary font-black underline">Créer un compte</Link></p>
          <button onClick={() => { setResetMode(!resetMode); setResetSent(false); setError(""); }}
            className="text-primary font-bold hover:underline">
            Mot de passe oublié ?
          </button>
        </div>

        {resetMode && (
          <div className="mt-4 bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
            {resetSent ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-green-400 text-[12px] font-medium">Email envoyé ! Vérifiez votre boîte mail.</p>
              </div>
            ) : (
              <>
                <p className="text-gray-400 text-[12px]">Un email de réinitialisation sera envoyé à l'adresse ci-dessus.</p>
                <button onClick={handleResetPassword} disabled={resetLoading || !email}
                  className="w-full bg-gray-700 text-white font-black py-3 rounded-xl text-[13px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {resetLoading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}