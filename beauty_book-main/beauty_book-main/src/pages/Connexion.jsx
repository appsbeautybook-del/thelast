import { checkIfBanned } from "@/lib/adminUserManagement";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle, Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useRateLimit } from "@/hooks/useRateLimit";

// ── Reset Password View ───────────────────────────────────────────────────────
function ResetPassword({ onBack }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-[28px] font-black text-white mb-3">Mot de passe mis à jour !</h2>
            <p className="text-[14px] text-white/40 font-medium leading-relaxed">
              Votre mot de passe a été réinitialisé avec succès.
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white bg-gradient-to-r from-[#E8732A] to-[#d4651e] active:scale-[0.98] transition-all shadow-lg shadow-[#E8732A]/20"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col">
      <div className="px-5 pt-12 pb-6 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <span className="text-[16px] font-bold text-white">Nouveau mot de passe</span>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#E8732A]/20 to-[#E8732A]/5 border border-[#E8732A]/30 flex items-center justify-center mb-6">
            <Lock className="w-9 h-9 text-[#E8732A]" />
          </div>
          <h2 className="text-[32px] font-black text-white leading-tight mb-3">Créez votre<br />nouveau mot de passe</h2>
          <p className="text-[13px] text-white/40 font-medium leading-relaxed">
            Choisissez un mot de passe fort pour sécuriser votre compte.
          </p>
        </div>

        <div className="space-y-5 flex-1">
          <div>
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Nouveau mot de passe</label>
            <div className="relative">
              <input
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pr-12 text-[14px] font-medium text-white outline-none focus:border-[#E8732A]/50 focus:bg-white/[0.07] transition-all placeholder:text-white/20"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{ background: i <= pwdScore ? (pwdScore <= 1 ? "#ef4444" : pwdScore === 2 ? "#f97316" : pwdScore === 3 ? "#eab308" : "#22c55e") : "rgba(255,255,255,0.08)" }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {[
                    { check: pwdChecks.length, label: "8 car. min" },
                    { check: pwdChecks.upper, label: "Majuscule" },
                    { check: pwdChecks.number, label: "Chiffre" },
                    { check: pwdChecks.special, label: "Spécial" },
                  ].map(({ check, label }) => (
                    <span key={label} className={`text-[10px] font-bold ${check ? "text-emerald-400" : "text-white/30"}`}>
                      {check ? "✓" : "○"} {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pr-12 text-[14px] font-medium text-white outline-none focus:border-[#E8732A]/50 focus:bg-white/[0.07] transition-all placeholder:text-white/20"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-red-400 font-medium mt-2">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          {error && <p className="text-[12px] text-red-400 font-medium">{error}</p>}
        </div>

        <div className="pb-8">
          <button
            onClick={handleReset}
            disabled={!isValid || loading}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white transition-all active:scale-[0.98]"
            style={{
              background: isValid && !loading ? "linear-gradient(135deg, #E8732A, #d4651e)" : "rgba(255,255,255,0.06)",
              boxShadow: isValid ? "0 0 40px rgba(232,115,42,0.3)" : "none",
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
  const { isLimited, remainingTime, checkLimit } = useRateLimit({ maxAttempts: 3, windowMs: 300000 });

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
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mb-6">
              <Mail className="w-9 h-9 text-emerald-400" />
            </div>
            <h2 className="text-[28px] font-black text-white mb-3">Email envoyé !</h2>
            <p className="text-[14px] text-white/40 font-medium leading-relaxed">
              Un lien de réinitialisation a été envoyé à{" "}
              <span className="text-white font-bold">{email}</span>. Vérifiez votre boîte mail.
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white bg-gradient-to-r from-[#E8732A] to-[#d4651e] active:scale-[0.98] transition-all shadow-lg shadow-[#E8732A]/20"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col">
      <div className="px-5 pt-12 pb-6 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <span className="text-[16px] font-bold text-white">Mot de passe oublié</span>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#E8732A]/20 to-[#E8732A]/5 border border-[#E8732A]/30 flex items-center justify-center mb-6">
            <Lock className="w-9 h-9 text-[#E8732A]" />
          </div>
          <h2 className="text-[32px] font-black text-white leading-tight mb-3">Réinitialiser<br />votre mot de passe</h2>
          <p className="text-[13px] text-white/40 font-medium leading-relaxed">
            Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>

        <div className="space-y-5 flex-1">
          <div>
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Adresse e-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-[14px] font-medium text-white outline-none focus:border-[#E8732A]/50 focus:bg-white/[0.07] transition-all placeholder:text-white/20"
                type="email"
                placeholder="sophie.martin@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <p className="text-[12px] text-red-400 font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="pb-8">
          <button
            onClick={handleSend}
            disabled={!email || loading}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white transition-all active:scale-[0.98]"
            style={{
              background: email && !loading ? "linear-gradient(135deg, #E8732A, #d4651e)" : "rgba(255,255,255,0.06)",
              boxShadow: email ? "0 0 40px rgba(232,115,42,0.3)" : "none",
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

  useEffect(() => {
    const remembered = localStorage.getItem("bb_remember_email");
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  const [isResetMode, setIsResetMode] = useState(() => {
    const hash = window.location.hash;
    return hash.includes('type=recovery');
  });

  useEffect(() => {
    if (isResetMode) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [isResetMode]);

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

    const banStatus = await checkIfBanned({ email });
    if (banStatus.isBanned) {
      setError(banStatus.reason || "🚫 Ce compte ou cet appareil a été banni à vie par l'administration.");
      setLoading(false);
      return;
    }

    let loginSuccess = false;
    try {
      localStorage.setItem("bb_onboarded", "1");
      if (email) {
        localStorage.setItem("bb_remember_email", email);
        if (remember) {
          localStorage.setItem("bb_remember", "1");
        }
      }

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
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E8732A]/[0.03] blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#E8732A]/[0.02] blur-[100px]" />

      {/* Header */}
      <div className="relative z-10 px-6 pt-14 pb-4">
        <div className="flex items-center gap-4 mb-12">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-14">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E8732A] to-[#d4651e] flex items-center justify-center shadow-lg shadow-[#E8732A]/20">
            <svg width="24" height="26" viewBox="0 0 42 46" fill="none">
              <rect x="2" y="2" width="22" height="21" rx="10" fill="white" opacity="0.9"/>
              <rect x="2" y="19" width="28" height="25" rx="12" fill="white"/>
              <circle cx="32" cy="8" r="5" fill="white"/>
            </svg>
          </div>
          <span className="text-white/30 text-[13px] font-black uppercase tracking-[0.3em]">BeautyBook</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 px-6 flex flex-col">
        <h2 className="text-[36px] font-black text-white leading-[1.1] mb-2">Bon retour<br />parmi nous</h2>
        <p className="text-[14px] text-white/30 font-medium mb-10">Connectez-vous pour accéder à votre espace beauté.</p>

        <div className="space-y-4 flex-1">
          {/* Email Input */}
          <div>
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Adresse e-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-[14px] font-medium text-white outline-none focus:border-[#E8732A]/50 focus:bg-white/[0.07] transition-all placeholder:text-white/20"
                type="email"
                placeholder="sophie.martin@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-12 py-4 text-[14px] font-medium text-white outline-none focus:border-[#E8732A]/50 focus:bg-white/[0.07] transition-all placeholder:text-white/20"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember / Forgot */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setRemember(!remember)}
              className="flex items-center gap-2.5 active:scale-95 transition-all"
            >
              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${remember ? "border-[#E8732A] bg-[#E8732A]" : "border-white/20 bg-transparent"}`}>
                {remember && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-[12px] font-bold text-white/50">Rester connecté</span>
            </button>
            <button
              onClick={() => setShowForgot(true)}
              className="text-[12px] font-bold text-[#E8732A] hover:text-[#E8732A]/80 transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 space-y-2">
              <p className="text-[12px] text-red-400 font-medium">{error}</p>
              {emailNotConfirmed && (
                <button
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="text-[12px] font-bold text-[#E8732A] underline"
                >
                  {resending ? "Envoi en cours..." : "Renvoyer l'email de confirmation"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pb-8 space-y-5">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #E8732A, #d4651e)",
              boxShadow: "0 0 40px rgba(232,115,42,0.3)"
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Se connecter
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-[13px] text-white/30 font-medium">
            Pas encore de compte ?{" "}
            <button
              onClick={() => { sessionStorage.removeItem("bb_signup_data"); sessionStorage.setItem("bb_from_login", "1"); navigate("/onboarding"); }}
              className="font-bold text-[#E8732A] hover:text-[#E8732A]/80 transition-colors"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
