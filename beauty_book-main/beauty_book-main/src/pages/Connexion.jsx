import { checkIfBanned } from "@/lib/adminUserManagement";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle, Mail, Lock, ArrowRight, Fingerprint, Sparkles } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useRateLimit } from "@/hooks/useRateLimit";

const BRAND = "#E8732A";

function B({ size = 40, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <linearGradient id="bbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8732A"/>
          <stop offset="100%" stopColor="#c45a1c"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bbg)"/>
      <path d="M35 28h14c8 0 14 5 14 12s-6 12-14 12H35V28z" fill="white" opacity="0.85"/>
      <path d="M35 52h15c8 0 14 5 14 12s-6 12-14 12H35V52z" fill="white"/>
      <circle cx="66" cy="32" r="5" fill="white" opacity="0.7"/>
    </svg>
  );
}

function GlowOrb({ className }) {
  return <div className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`} />;
}

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
    } catch {
      setError("Impossible de réinitialiser. Le lien a peut-être expiré.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-[24px] bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-8">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-[26px] font-extrabold text-white mb-3 tracking-tight">C'est fait !</h2>
          <p className="text-[14px] text-white/35 mb-10 leading-relaxed">Mot de passe mis à jour avec succès.</p>
          <button onClick={onBack} className="w-full h-14 rounded-2xl font-extrabold text-[13px] uppercase tracking-[0.15em] text-white active:scale-[0.97] transition-transform" style={{ background: BRAND }}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] flex flex-col">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center active:scale-95 transition">
          <ArrowLeft className="w-[18px] h-[18px] text-white/50" />
        </button>
        <span className="text-[15px] font-bold text-white/80">Nouveau mot de passe</span>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <div className="text-center mt-8 mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6">
            <Lock className="w-7 h-7 text-white/40" />
          </div>
          <h2 className="text-[28px] font-extrabold text-white leading-tight mb-2 tracking-tight">Nouveau<br />mot de passe</h2>
          <p className="text-[13px] text-white/30">Sécurisez votre compte.</p>
        </div>

        <div className="space-y-5 flex-1">
          <div>
            <label className="text-[10px] font-extrabold text-white/30 uppercase tracking-[0.2em] mb-2 block">Mot de passe</label>
            <div className="relative">
              <input className="w-full h-13 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 pr-12 text-[14px] font-medium text-white outline-none focus:border-white/20 transition placeholder:text-white/15" type={showPwd ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition"><EyeIcon show={showPwd} /></button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-3">
                <div className="flex gap-1 mb-2">{[1,2,3,4].map(i => <div key={i} className="flex-1 h-[3px] rounded-full transition-all duration-300" style={{ background: i <= pwdScore ? (pwdScore <= 1 ? "#ef4444" : pwdScore === 2 ? "#f97316" : pwdScore === 3 ? "#eab308" : "#22c55e") : "rgba(255,255,255,0.06)" }} />)}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {[{ c: pwdChecks.length, l: "8 car." },{ c: pwdChecks.upper, l: "Maj." },{ c: pwdChecks.number, l: "Chiffre" },{ c: pwdChecks.special, l: "Spécial" }].map(({ c, l }) => (
                    <span key={l} className={`text-[10px] font-bold ${c ? "text-emerald-400" : "text-white/20"}`}>{c ? "✓" : "○"} {l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-white/30 uppercase tracking-[0.2em] mb-2 block">Confirmer</label>
            <input className="w-full h-13 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-[14px] font-medium text-white outline-none focus:border-white/20 transition placeholder:text-white/15" type={showPwd ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            {newPassword && confirmPassword && newPassword !== confirmPassword && <p className="text-[11px] text-red-400/80 mt-2">Ne correspondent pas</p>}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/15 rounded-xl px-4 py-3"><p className="text-[12px] text-red-400/90 font-medium">{error}</p></div>}
        </div>

        <button onClick={handleReset} disabled={!isValid || loading} className="w-full h-14 rounded-2xl font-extrabold text-[13px] uppercase tracking-[0.15em] text-white mb-8 active:scale-[0.97] transition-all" style={{ background: isValid && !loading ? BRAND : "rgba(255,255,255,0.04)" }}>
          {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /> : "Confirmer"}
        </button>
      </div>
    </div>
  );
}

function EyeIcon({ show }) {
  return show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />;
}

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { checkLimit } = useRateLimit({ maxAttempts: 3, windowMs: 300000 });

  const handleSend = async () => {
    if (!email || loading) return;
    if (!checkLimit()) { setError("Trop de tentatives. Réessayez plus tard."); return; }
    setLoading(true); setError("");
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/connexion` });
      if (e) throw e;
      setSent(true);
    } catch { setError("Impossible d'envoyer l'email."); } finally { setLoading(false); }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-[24px] bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-8">
            <Mail className="w-9 h-9 text-emerald-400" />
          </div>
          <h2 className="text-[26px] font-extrabold text-white mb-3 tracking-tight">Email envoyé</h2>
          <p className="text-[14px] text-white/35 mb-10 leading-relaxed">Un lien a été envoyé à <span className="text-white font-bold">{email}</span>.</p>
          <button onClick={onBack} className="w-full h-14 rounded-2xl font-extrabold text-[13px] uppercase tracking-[0.15em] text-white active:scale-[0.97] transition-transform" style={{ background: BRAND }}>Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] flex flex-col">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center active:scale-95 transition"><ArrowLeft className="w-[18px] h-[18px] text-white/50" /></button>
        <span className="text-[15px] font-bold text-white/80">Mot de passe oublié</span>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <div className="text-center mt-8 mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6"><Lock className="w-7 h-7 text-white/40" /></div>
          <h2 className="text-[28px] font-extrabold text-white leading-tight mb-2 tracking-tight">Récupérez<br />votre accès</h2>
          <p className="text-[13px] text-white/30">On vous envoie un lien de réinitialisation.</p>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="text-[10px] font-extrabold text-white/30 uppercase tracking-[0.2em] mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input className="w-full h-13 bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[14px] font-medium text-white outline-none focus:border-white/20 transition placeholder:text-white/15" type="email" placeholder="vous@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} />
            </div>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/15 rounded-xl px-4 py-3"><p className="text-[12px] text-red-400/90 font-medium">{error}</p></div>}
        </div>

        <button onClick={handleSend} disabled={!email || loading} className="w-full h-14 rounded-2xl font-extrabold text-[13px] uppercase tracking-[0.15em] text-white mb-8 active:scale-[0.97] transition-all" style={{ background: email && !loading ? BRAND : "rgba(255,255,255,0.04)" }}>
          {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /> : "Envoyer"}
        </button>
      </div>
    </div>
  );
}

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
  const { checkLimit } = useRateLimit({ maxAttempts: 5, windowMs: 300000 });

  useEffect(() => {
    const r = localStorage.getItem("bb_remember_email");
    if (r) { setEmail(r); setRemember(true); }
  }, []);

  const [isResetMode, setIsResetMode] = useState(() => window.location.hash.includes('type=recovery'));
  useEffect(() => { if (isResetMode) window.history.replaceState(null, '', window.location.pathname + window.location.search); }, [isResetMode]);

  if (isResetMode) return <ResetPassword onBack={() => { setIsResetMode(false); navigate('/connexion', { replace: true }); }} />;
  if (showForgot) return <ForgotPassword onBack={() => setShowForgot(false)} />;

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true); setError(""); setEmailNotConfirmed(false);

    const ban = await checkIfBanned({ email });
    if (ban.isBanned) { setError(ban.reason || "🚫 Ce compte a été banni."); setLoading(false); return; }

    let ok = false;
    try {
      localStorage.setItem("bb_onboarded", "1");
      if (email) { localStorage.setItem("bb_remember_email", email); if (remember) localStorage.setItem("bb_remember", "1"); }

      if (email && password) {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) {
          if (e.message?.includes('Email not confirmed')) { setEmailNotConfirmed(true); setError("Email non confirmé. Vérifiez votre boîte mail."); }
          else setError("Identifiants invalides.");
          setLoading(false); return;
        }
        if (data?.user) {
          try { await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: data.user.user_metadata?.full_name || email.split('@')[0], role: 'client', updated_at: new Date().toISOString() }, { onConflict: 'id' }); } catch {}
          ok = true;
        }
      }
    } catch { setError("Erreur de connexion."); } finally { setLoading(false); if (ok) navigate("/", { replace: true }); }
  };

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    try { await supabase.auth.resend({ email, type: 'signup' }); setError("Email renvoyé. Vérifiez votre boîte."); setEmailNotConfirmed(false); } catch { setError("Erreur lors de l'envoi."); }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-[#08080a] flex flex-col relative overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] -top-40 -right-40 bg-[#E8732A]/[0.06]" />
      <GlowOrb className="w-[350px] h-[350px] bottom-0 -left-32 bg-[#E8732A]/[0.04]" />

      <div className="relative z-10 px-6 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center active:scale-95 transition mb-10">
          <ArrowLeft className="w-[18px] h-[18px] text-white/50" />
        </button>
        <div className="flex items-center gap-3 mb-16">
          <B size={44} />
          <span className="text-white/20 text-[12px] font-extrabold uppercase tracking-[0.35em]">BeautyBook</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 px-6 flex flex-col">
        <h2 className="text-[32px] font-extrabold text-white leading-[1.05] mb-1.5 tracking-tight">Bon retour<br />parmi nous</h2>
        <p className="text-[13px] text-white/25 mb-10">Connectez-vous pour accéder à votre espace.</p>

        <div className="space-y-4 flex-1">
          <div>
            <label className="text-[10px] font-extrabold text-white/30 uppercase tracking-[0.2em] mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input className="w-full h-13 bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 text-[14px] font-medium text-white outline-none focus:border-white/20 transition placeholder:text-white/15" type="email" placeholder="vous@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-white/30 uppercase tracking-[0.2em] mb-2 block">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input className="w-full h-13 bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-12 text-[14px] font-medium text-white outline-none focus:border-white/20 transition placeholder:text-white/15" type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition"><EyeIcon show={showPwd} /></button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <button onClick={() => setRemember(!remember)} className="flex items-center gap-2.5 active:scale-95 transition">
              <div className={`w-[18px] h-[18px] rounded-md border-[1.5px] flex items-center justify-center transition-all ${remember ? "border-[#E8732A] bg-[#E8732A]" : "border-white/15 bg-transparent"}`}>
                {remember && <svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-[12px] font-semibold text-white/40">Rester connecté</span>
            </button>
            <button onClick={() => setShowForgot(true)} className="text-[12px] font-bold text-white/50 hover:text-white/70 transition">Mot de passe oublié ?</button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/15 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-[12px] text-red-400/90 font-medium">{error}</p>
              {emailNotConfirmed && <button onClick={handleResend} disabled={resending} className="text-[12px] font-bold text-white/50 underline">{resending ? "Envoi..." : "Renvoyer"}</button>}
            </div>
          )}
        </div>

        <div className="pb-8 space-y-4">
          <button onClick={handleLogin} disabled={loading} className="w-full h-14 rounded-2xl font-extrabold text-[13px] uppercase tracking-[0.15em] text-white active:scale-[0.97] transition-all flex items-center justify-center gap-2" style={{ background: BRAND }}>
            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><span>Se connecter</span><ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-center text-[13px] text-white/25">
            Pas encore de compte ? <button onClick={() => { sessionStorage.removeItem("bb_signup_data"); sessionStorage.setItem("bb_from_login", "1"); navigate("/onboarding"); }} className="font-bold text-white/60 hover:text-white/80 transition">Créer un compte</button>
          </p>
        </div>
      </div>
    </div>
  );
}
