import { checkIfBanned } from "@/lib/adminUserManagement";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useRateLimit } from "@/hooks/useRateLimit";

const SPLASH_IMG = "https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/39cb4873a_generated_image.png";
const LOGO_IMG = "https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/47f6dcd4b_generated_image.png";

// ── Reset Password View ───────────────────────────────────────────────────────
function ResetPassword({ onBack }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const inputClass = "w-full bg-gray-100 rounded-2xl px-4 py-4 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-gray-400";
  const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block";

  const pwdChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };
  const pwdScore = Object.values(pwdChecks).filter(Boolean).length;
  const pwdStrong = pwdScore >= 3;
  const isValid = pwdStrong && newPassword === confirmPassword && newPassword.length > 0;

  const handleReset = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (e) {
      setError("Impossible de réinitialiser le mot de passe. Le lien a peut-être expiré.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-display px-6 pt-16 pb-10">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-[28px] font-black text-gray-900 mb-2">Mot de passe mis à jour !</h2>
            <p className="text-[14px] text-gray-400 font-medium leading-relaxed max-w-[280px]">
              Votre mot de passe a été réinitialisé avec succès.
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all"
          style={{ background: "#E8732A" }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-display">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <span className="text-[16px] font-black text-gray-900">Nouveau mot de passe</span>
      </div>

      <div className="flex-1 px-6 pt-6 pb-10 flex flex-col">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center">
            <span className="text-[48px]">🔑</span>
          </div>
        </div>

        <h2 className="text-[28px] font-black text-gray-900 leading-tight mb-2">Créez votre<br />nouveau mot de passe</h2>
        <p className="text-[13px] text-gray-400 font-medium mb-8 leading-relaxed">
          Choisissez un mot de passe fort pour sécuriser votre compte.
        </p>

        <div className="space-y-4 flex-1">
          <div>
            <label className={labelClass}>Nouveau mot de passe</label>
            <div className="relative">
              <input
                className={inputClass + " pr-12"}
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{ background: i <= pwdScore ? (pwdScore <= 1 ? "#ef4444" : pwdScore === 2 ? "#f97316" : pwdScore === 3 ? "#eab308" : "#22c55e") : "#e5e7eb" }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {[
                    { check: pwdChecks.length, label: "8 car. min" },
                    { check: pwdChecks.upper, label: "Majuscule" },
                    { check: pwdChecks.number, label: "Chiffre" },
                    { check: pwdChecks.special, label: "Caractère spécial" },
                  ].map(({ check, label }) => (
                    <span key={label} className={`text-[10px] font-bold ${check ? "text-green-500" : "text-gray-400"}`}>
                      {check ? "✓" : "○"} {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Confirmer le mot de passe</label>
            <div className="relative">
              <input
                className={inputClass + " pr-12"}
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-red-500 font-medium mt-1">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
        </div>

        <div className="mt-6">
          <button
            onClick={handleReset}
            disabled={!isValid || loading}
            className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-95"
            style={{
              background: isValid && !loading ? "#E8732A" : "#d1d5db",
            }}
          >
            {loading ? "Enregistrement..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Forgot Password View ──────────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const { isLimited, remainingTime, checkLimit } = useRateLimit({ maxAttempts: 3, windowMs: 300000 });

  const inputClass = "w-full bg-gray-100 rounded-2xl px-4 py-4 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-gray-400";
  const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block";

  const handleSend = async () => {
    if (!email || loading) return;
    if (!checkLimit()) {
      setError(`Trop de tentatives. Réessayez dans ${remainingTime}s.`);
      return;
    }
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

          {error && (
            <div>
              <p className="text-[12px] text-red-500 font-medium">{error}</p>
              {error.includes("impossible") || error.includes("Vérifiez") ? (
                <p className="text-[11px] text-gray-400 font-medium mt-1">
                  Vérifiez votre adresse email et réessayez.
                </p>
              ) : null}
            </div>
          )}
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
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resending, setResending] = useState(false);
  const { isLimited, remainingTime, checkLimit } = useRateLimit({ maxAttempts: 5, windowMs: 300000 });

  // Restore saved email if "remember me" was checked
  useEffect(() => {
    const remembered = localStorage.getItem("bb_remember_email");
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  // Détecter si l'utilisateur vient d'un lien de réinitialisation de mot de passe
  const [isResetMode, setIsResetMode] = useState(() => {
    const hash = window.location.hash;
    return hash.includes('type=recovery');
  });

  useEffect(() => {
    if (isResetMode) {
      // Nettoyer le hash de l'URL après détection
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [isResetMode]);

  const inputClass = "w-full bg-gray-100 rounded-2xl px-4 py-4 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-gray-400";
  const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block";

  if (isResetMode) {
    return <ResetPassword onBack={() => { setIsResetMode(false); navigate('/connexion', { replace: true }); }} />;
  }

  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />;
  }

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setEmailNotConfirmed(false);

    // Vérifier si l'utilisateur ou cet appareil est banni à vie
    const banStatus = await checkIfBanned({ email });
    if (banStatus.isBanned) {
      setError(banStatus.reason || "🚫 Ce compte ou cet appareil a été banni à vie par l'administration.");
      setLoading(false);
      return;
    }

    let loginSuccess = false;
    try {
      // 1. Enregistrer l'état d'onboarding et l'email dans localStorage
      localStorage.setItem("bb_onboarded", "1");
      if (email) {
        localStorage.setItem("bb_remember_email", email);
        if (remember) {
          localStorage.setItem("bb_remember", "1");
        }
      }

      // 2. Connecter au compte inscrit avec l'email et le mot de passe
      if (email && password) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          if (signInError.message?.includes('Email not confirmed') || signInError.message?.includes('email not confirmed')) {
            setEmailNotConfirmed(true);
            setError("Email non confirmé. Vérifiez votre boîte mail ou cliquez sur renvoyer.");
          } else {
            setError("Identifiants invalides. Vérifiez votre email et mot de passe.");
          }
          setLoading(false);
          return;
        }

        if (signInData?.user) {
          try {
            await supabase.from('profiles').upsert({
              id: signInData.user.id,
              email: email,
              full_name: signInData.user.user_metadata?.full_name || email.split('@')[0],
              role: 'client',
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          } catch (errProfile) {
            console.warn("[Connexion] Profile upsert notice:", errProfile);
          }
          loginSuccess = true;
        }
      }
    } catch (e) {
      console.warn("[Connexion] Login process error:", e);
      setError("Erreur lors de la connexion. Réessayez.");
    } finally {
      setLoading(false);
      if (loginSuccess) {
        navigate("/", { replace: true });
      }
    }
  };

  const handleResendConfirmation = async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      await supabase.auth.resend({ email, type: 'signup' });
      setError("Email de confirmation renvoyé. Vérifiez votre boîte de réception.");
      setEmailNotConfirmed(false);
    } catch {
      setError("Erreur lors de l'envoi. Réessayez.");
    }
    setResending(false);
  };

  const handleOAuth = async (provider) => {
    try {
      setLoading(true);
      setError("");
      const { isNativeApp, signInWithOAuthMobile, signInWithOAuthWeb } = await import('@/lib/oauth-mobile');
      if (isNativeApp()) {
        await signInWithOAuthMobile(provider);
      } else {
        await signInWithOAuthWeb(provider);
      }
    } catch (e) {
      console.error(`[${provider} Auth] Error:`, e);
      setLoading(false);
      const providerName = provider === 'google' ? 'Google' : 'Apple';
      if (e.message?.includes('not enabled') || e.message?.includes('provider')) {
        setError(`Le provider ${providerName} n'est pas activé dans le dashboard Supabase.`);
      } else if (e.message?.includes('popup')) {
        setError(`Le popup a été bloqué. Autorisez les popups pour ce site.`);
      } else {
        setError(`Erreur avec ${providerName}: ${e.message || 'Vérifiez la configuration.'}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-display">

      {/* Hero image top */}
      <div className="relative h-52 shrink-0">
        <img src={SPLASH_IMG} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.5) 0%, rgba(255,255,255,1) 100%)" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pb-4">
          <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center" style={{ background: "#F5EDE4", border: "3px solid #E8DDD0" }}>
            <svg width="42" height="46" viewBox="0 0 42 46" fill="none">
              {/* Top half of B — light orange */}
              <rect x="2" y="2" width="22" height="21" rx="10" fill="#F5B87A"/>
              {/* Bottom half of B — dark orange */}
              <rect x="2" y="19" width="28" height="25" rx="12" fill="#E8732A"/>
              {/* Dot */}
              <circle cx="32" cy="8" r="5" fill="#E8732A"/>
            </svg>
          </div>
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

          {error && (
            <div>
              <p className="text-[12px] text-red-500 font-medium">{error}</p>
              {emailNotConfirmed && (
                <button
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="text-[12px] font-black mt-2 underline"
                  style={{ color: "#E8732A" }}
                >
                  {resending ? "Envoi en cours..." : "Renvoyer l'email de confirmation"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 mt-6">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-95"
            style={{ background: "#E8732A", boxShadow: "0 0 30px rgba(232,115,42,0.35)" }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          {/* Google button hidden */}

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

      {/* Floating back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed bottom-6 left-6 w-11 h-11 bg-gray-900 rounded-full flex items-center justify-center shadow-lg shadow-black/20 active:scale-90 transition-all z-50"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}