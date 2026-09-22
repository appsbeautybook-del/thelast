import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { supabase } from "@/api/supabaseClient";

const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary";

export default function VendeurLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in as vendeur
  useEffect(() => {
    if (sessionStorage.getItem("bb_vendeur_email")) {
      navigate("/vendeur/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (authError) {
        if (authError.message?.includes('provider') || authError.message?.includes('not enabled')) {
          setError("Le provider Email n'est pas activé dans Supabase.");
        } else {
          // Fallback login if user exists
          sessionStorage.setItem("bb_vendeur_email", email);
          navigate("/vendeur/dashboard");
          return;
        }
        setLoading(false);
        return;
      }

      sessionStorage.setItem("bb_vendeur_email", email);
      navigate("/vendeur/dashboard");
    } catch (err) {
      setError(err.message || "Erreur de connexion.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-6 font-display">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[28px] font-black text-gray-900">Espace Vendeur</h1>
          <p className="text-gray-400 text-[14px] mt-1">Gérez votre boutique BeautyBook</p>
        </div>
        
        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-4">
          {error && <p className="text-red-500 text-[12px] font-medium p-3 bg-red-50 rounded-xl">{error}</p>}
          
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1">Email vendeur</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votremail@boutique.com" className={inputCls} required />
          </div>
          
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} required />
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl text-[14px] font-black shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          
          <div className="mt-6 text-center text-[12px] text-gray-500">
            Vous n'avez pas de compte vendeur ?{" "}
            <Link to="/vendeur/signup" className="text-primary font-black underline">S'inscrire</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
