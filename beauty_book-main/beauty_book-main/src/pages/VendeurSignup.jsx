import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Store, Loader2, User, Phone } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { supabase } from "@/api/supabaseClient";

const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary transition-colors";

export default function VendeurSignup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (sessionStorage.getItem("bb_vendeur_email")) {
      navigate("/vendeur/dashboard");
    }
  }, [navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // 1. Inscription via Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { prenom, nom, phone, role: 'vendeur' } }
      });
      
      if (authError) {
        if (authError.message?.includes('provider') || authError.message?.includes('not enabled')) {
          setError("Le provider Email n'est pas activé. Activez-le dans le dashboard Supabase > Authentication > Providers > Email.");
        } else {
          setError(authError.message || "Erreur lors de l'inscription.");
        }
        setLoading(false);
        return;
      }

      // 2. Créer le profil vendeur
      if (data?.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, email, role: 'vendeur', prenom, nom });
      }

      // 3. Connexion auto
      sessionStorage.setItem("bb_vendeur_email", email);
      navigate("/vendeur/dashboard");
    } catch (err) {
      setError(err.message || "Impossible de s'inscrire.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-6 font-display py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[28px] font-black text-gray-900">Créer une boutique</h1>
          <p className="text-gray-400 text-[14px] mt-1">Rejoignez BeautyBook en tant que vendeur</p>
        </div>
        
        <form onSubmit={handleSignup} className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-4">
          {error && <p className="text-red-500 text-[12px] font-medium p-3 bg-red-50 rounded-xl">{error}</p>}
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1">Prénom</label>
              <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Jean" className={inputCls} required />
            </div>
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1">Nom</label>
              <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Dupont" className={inputCls} required />
            </div>
          </div>
          
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1">Téléphone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 12 34 56 78" className={inputCls} required />
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1">Email pro</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="boutique@beautybook.fr" className={inputCls} required />
          </div>
          
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} required minLength={6} />
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl text-[14px] font-black shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-4">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Création..." : "Ouvrir ma boutique"}
          </button>
          
          <div className="mt-6 text-center text-[12px] text-gray-500">
            Vous avez déjà un compte ?{" "}
            <Link to="/vendeur/login" className="text-primary font-black underline">Se connecter</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
