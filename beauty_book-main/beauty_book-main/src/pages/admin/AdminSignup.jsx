import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from '@/api/supabaseClient';
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/lib/AuthContext";

export default function AdminSignup() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Inscription via Supabase Auth (signUp fonctionne avec la clé anon)
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: `${prenom} ${nom}`, role: 'admin' }
        }
      });

      if (authError) {
        if (authError.message?.includes('provider') || authError.message?.includes('not enabled')) {
          setError("Le provider Email n'est pas activé. Activez-le dans le dashboard Supabase > Authentication > Providers > Email.");
        } else {
          setError(authError.message || "Erreur lors de la création du compte.");
        }
        setLoading(false);
        return;
      }

      // 2. Mettre à jour le profil avec le rôle admin
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: `${prenom} ${nom}`,
          role: 'admin'
        });
      }

      // 3. Si Supabase nécessite confirmation email, rediriger vers la page de vérification
      if (data?.user && !data.session) {
        sessionStorage.setItem("bb_admin_verify_email", email);
        navigate("/admin/verify?email=" + encodeURIComponent(email));
        return;
      }

      // 4. Connexion auto si la session est disponible
      if (data?.session) {
        navigate("/admin/dashboard");
      } else {
        sessionStorage.setItem("bb_admin_verify_email", email);
        navigate("/admin/verify?email=" + encodeURIComponent(email));
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white text-[26px] font-black">BeautyBook</h1>
          <p className="text-gray-400 text-[13px] font-medium mt-1">Création de compte Admin</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-2 block">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                placeholder="Jean"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-4 text-[14px] outline-none focus:border-primary transition-colors placeholder:text-gray-500"
                required
              />
            </div>
            <div>
              <label className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-2 block">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Dupont"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-4 text-[14px] outline-none focus:border-primary transition-colors placeholder:text-gray-500"
                required
              />
            </div>
          </div>

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
                minLength={6}
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
            className="w-full bg-primary text-white font-black py-4 rounded-2xl text-[15px] uppercase tracking-widest shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Création..." : "Créer le compte"}
          </button>
        </form>

        <div className="mt-8 text-center text-[12px] text-gray-500">
            Vous avez déjà un compte ?{" "}
            <Link to="/admin" className="text-primary font-black underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
