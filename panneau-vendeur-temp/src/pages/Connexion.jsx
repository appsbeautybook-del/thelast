import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

const SPLASH_IMG = "https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/39cb4873a_generated_image.png";

// ── Forgot Password View ──────────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const inputClass = "w-full bg-gray-100 rounded-2xl px-4 py-4 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-gray-400";
  const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block";

  const handleSend = async () => {
    if (!email || loading) return;
    setLoading(true);
    setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/connexion`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (e) {
      setError("Impossible d'envoyer l'email. Vérifiez votre adresse et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-display px-6 pt-16 pb-10">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-[28px] font-black text-gray-900 mb-2">Email envoyé !</h2>
            <p className="text-[14px] text-gray-400 font-medium leading-relaxed max-w-[280px]">
              Un lien de réinitialisation a été envoyé à <span className="font-black text-gray-700">{email}</span>. Vérifiez votre boîte mail.
            </p>
          </div>
          <p className="text-[12px] text-gray-300 font-medium">
            Vous n'avez pas reçu l'email ? Vérifiez vos spams.
          </p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all"
          style={{ background: "#E8732A" }}
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-display">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <span className="text-[16px] font-black text-gray-900">Mot de passe oublié</span>
      </div>

      <div className="flex-1 px-6 pt-6 pb-10 flex flex-col">
        {/* Illustration */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center">
            <span className="text-[48px]">🔐</span>
          </div>
        </div>

        <h2 className="text-[28px] font-black text-gray-900 leading-tight mb-2">Réinitialiser<br />votre mot de passe</h2>
        <p className="text-[13px] text-gray-400 font-medium mb-8 leading-relaxed">
          Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        <div className="space-y-4 flex-1">
          <div>
            <label className={labelClass}>Adresse e-mail</label>
            <input
              className={inputClass}
              type="email"
              placeholder="sophie.martin@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
            />
          </div>
          {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
        </div>

        <div className="mt-6">
          <button
            onClick={handleSend}
            disabled={!email || loading}
            className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-95"
            style={{
              background: email && !loading ? "#E8732A" : "#d1d5db",
              boxShadow: email ? "0 0 30px rgba(232,115,42,0.35)" : "none"
            }}
          >
            {loading ? "Envoi en cours..." : "Envoyer le lien"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Login View ────────────────────────────────────────────────────────────────
export default function Connexion() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const inputClass = "w-full bg-gray-100 rounded-2xl px-4 py-4 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-gray-400";
  const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block";

  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />;
  }

  const handleLogin = async () => {
    if (!email || !password || loading) return;
    setLoading(true);
    setError("");
    try {
      if (remember) localStorage.setItem("bb_remember", "1");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message?.includes('provider') || signInError.message?.includes('not enabled')) {
          throw new Error("Le provider Email n'est pas activé. Activez-le dans le dashboard Supabase > Authentication > Providers > Email.");
        }
        throw signInError;
      }
      localStorage.setItem("bb_onboarded", "1");
      navigate("/", { replace: true });
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid")) {
        setError("Email ou mot de passe incorrect. Vérifiez vos identifiants ou créez un compte.");
      } else if (msg.includes("Email not confirmed") || msg.includes("not confirmed")) {
        setError("Votre email n'est pas encore confirmé. Vérifiez votre boîte mail.");
      } else if (msg.includes("Too many")) {
        setError("Trop de tentatives. Réessayez dans quelques minutes.");
      } else if (msg.includes("provider") || msg.includes("not enabled")) {
        setError("Le provider Email n'est pas activé dans Supabase.");
      } else {
        setError("Erreur de connexion : " + (msg || "Vérifiez vos identifiants."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    try {
      const { signInWithOAuthWeb } = await import('@/lib/oauth-mobile');
      await signInWithOAuthWeb(provider);
    } catch (e) {
      console.error(`[${provider} Auth] Error:`, e);
      setError(`Erreur lors de la connexion avec ${provider === 'google' ? 'Google' : 'Apple'}.`);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-display">

      {/* Hero image top */}
      <div className="relative h-52 shrink-0">
        <img src={SPLASH_IMG} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.5) 0%, rgba(255,255,255,1) 100%)" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-4">
          <svg width="52" height="52" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="34" stroke="#E8732A" strokeWidth="2.5" fill="none" opacity="0.3"/>
            <path d="M22 20h16c5.523 0 10 4.477 10 10s-4.477 10-10 10H22V20z" fill="#E8732A" opacity="0.85"/>
            <path d="M22 40h18c5.523 0 10 4.477 10 10s-4.477 10-10 10H22V40z" fill="#E8732A"/>
            <circle cx="52" cy="24" r="4" fill="white" opacity="0.9"/>
          </svg>
          <span className="text-white text-[16px] font-black uppercase tracking-[0.25em]" style={{ textShadow: "0 2px 16px rgba(232,115,42,0.9)" }}>BeautyBook</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-6 pb-10 flex flex-col">
        <h2 className="text-[30px] font-black text-gray-900 leading-tight mb-1">Bon retour<br />parmi nous 👋</h2>
        <p className="text-[13px] text-gray-400 font-medium mb-7">Connectez-vous pour accéder à votre espace beauté.</p>

        <div className="space-y-4 flex-1">
          <div>
            <label className={labelClass}>Adresse e-mail</label>
            <input
              className={inputClass}
              type="email"
              placeholder="sophie.martin@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Mot de passe</label>
            <div className="relative">
              <input
                className={inputClass + " pr-12"}
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setRemember(!remember)}
              className="flex items-center gap-2 active:scale-95 transition-all"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${remember ? "border-primary bg-primary" : "border-gray-300 bg-white"}`}>
                {remember && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-[12px] font-bold text-gray-600">Rester connecté</span>
            </button>
            <button
              onClick={() => setShowForgot(true)}
              className="text-[12px] font-black"
              style={{ color: "#E8732A" }}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
        </div>

        <div className="space-y-4 mt-6">
          <button
            onClick={handleLogin}
            disabled={!email || !password || loading}
            className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-95"
            style={{ background: email && password && !loading ? "#E8732A" : "#d1d5db", boxShadow: email && password ? "0 0 30px rgba(232,115,42,0.35)" : "none" }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ou continuer avec</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-4 active:scale-95 transition-all shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="flex-1 text-left text-[14px] font-black text-gray-800">Continuer avec Google</span>
              <span className="text-gray-300">›</span>
            </button>

            <button
              onClick={() => handleOAuth('apple')}
              className="w-full flex items-center gap-3 bg-black rounded-2xl px-5 py-4 active:scale-95 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span className="flex-1 text-left text-[14px] font-black text-white">Continuer avec Apple</span>
              <span className="text-gray-500">›</span>
            </button>
          </div>

          <p className="text-center text-[12px] text-gray-400 font-medium pt-2">
            Pas encore de compte ?{" "}
            <button
              onClick={() => { sessionStorage.removeItem("bb_signup_data"); sessionStorage.setItem("bb_from_login", "1"); navigate("/onboarding"); }}
              className="font-black" style={{ color: "#E8732A" }}
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}