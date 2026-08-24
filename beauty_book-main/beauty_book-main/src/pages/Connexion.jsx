import { checkIfBanned } from "@/lib/adminUserManagement";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle, Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useRateLimit } from "@/hooks/useRateLimit";

const BRAND = "#E8732A";
const BRAND_LIGHT = "#FFF4ED";

function B({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill={BRAND}/>
      <path d="M35 28h14c8 0 14 5 14 12s-6 12-14 12H35V28z" fill="white" opacity="0.85"/>
      <path d="M35 52h15c8 0 14 5 14 12s-6 12-14 12H35V52z" fill="white"/>
      <circle cx="66" cy="32" r="5" fill="white" opacity="0.7"/>
    </svg>
  );
}

function ResetPassword({ onBack }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const pwdChecks = { length: newPassword.length >= 8, upper: /[A-Z]/.test(newPassword), number: /[0-9]/.test(newPassword), special: /[^A-Za-z0-9]/.test(newPassword) };
  const pwdScore = Object.values(pwdChecks).filter(Boolean).length;
  const pwdStrong = pwdScore >= 3;
  const isValid = pwdStrong && newPassword === confirmPassword && newPassword.length > 0;

  const handleReset = async () => {
    if (!isValid || loading) return;
    setLoading(true); setError("");
    try { const { error: e } = await supabase.auth.updateUser({ password: newPassword }); if (e) throw e; setSuccess(true); }
    catch { setError("Lien expiré ou invalide."); } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mb-8"><CheckCircle className="w-8 h-8 text-green-500" /></div>
          <h2 className="text-[24px] font-extrabold text-gray-900 mb-2 tracking-tight">C'est fait !</h2>
          <p className="text-[13px] text-gray-400 mb-10">Mot de passe mis à jour.</p>
          <button onClick={onBack} className="w-full h-13 rounded-xl font-extrabold text-[13px] uppercase tracking-[0.12em] text-white active:scale-[0.97] transition" style={{ background: BRAND }}>Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center active:scale-95 transition"><ArrowLeft className="w-[18px] h-[18px] text-gray-400" /></button>
        <span className="text-[15px] font-bold text-gray-800">Nouveau mot de passe</span>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <div className="text-center mt-8 mb-10">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ background: BRAND_LIGHT }}><Lock className="w-6 h-6" style={{ color: BRAND }} /></div>
          <h2 className="text-[26px] font-extrabold text-gray-900 leading-tight mb-2 tracking-tight">Nouveau<br />mot de passe</h2>
          <p className="text-[13px] text-gray-400">Sécurisez votre compte.</p>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.18em] mb-2 block">Mot de passe</label>
            <div className="relative">
              <input className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 pr-11 text-[14px] font-medium text-gray-800 outline-none focus:border-orange-200 focus:bg-white transition placeholder:text-gray-300" type={showPwd ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"><EyeIcon show={showPwd} /></button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-3">
                <div className="flex gap-1 mb-2">{[1,2,3,4].map(i => <div key={i} className="flex-1 h-[3px] rounded-full transition-all duration-300" style={{ background: i <= pwdScore ? (pwdScore <= 1 ? "#ef4444" : pwdScore === 2 ? "#f97316" : pwdScore === 3 ? "#eab308" : "#22c55e") : "#f3f4f6" }} />)}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {[{ c: pwdChecks.length, l: "8 car." },{ c: pwdChecks.upper, l: "Maj." },{ c: pwdChecks.number, l: "Chiffre" },{ c: pwdChecks.special, l: "Spécial" }].map(({ c, l }) => (
                    <span key={l} className={`text-[10px] font-bold ${c ? "text-green-500" : "text-gray-300"}`}>{c ? "✓" : "○"} {l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.18em] mb-2 block">Confirmer</label>
            <input className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-[14px] font-medium text-gray-800 outline-none focus:border-orange-200 focus:bg-white transition placeholder:text-gray-300" type={showPwd ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            {newPassword && confirmPassword && newPassword !== confirmPassword && <p className="text-[11px] text-red-400 mt-2">Ne correspondent pas</p>}
          </div>

          {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-[12px] text-red-500 font-medium">{error}</p></div>}
        </div>

        <button onClick={handleReset} disabled={!isValid || loading} className="w-full h-13 rounded-xl font-extrabold text-[13px] uppercase tracking-[0.12em] text-white mb-8 active:scale-[0.97] transition-all" style={{ background: isValid && !loading ? BRAND : "#e5e7eb" }}>
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : "Confirmer"}
        </button>
      </div>
    </div>
  );
}

function EyeIcon({ show }) { return show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />; }

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { checkLimit } = useRateLimit({ maxAttempts: 3, windowMs: 300000 });

  const handleSend = async () => {
    if (!email || loading) return;
    if (!checkLimit()) { setError("Trop de tentatives."); return; }
    setLoading(true); setError("");
    try { const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/connexion` }); if (e) throw e; setSent(true); }
    catch { setError("Impossible d'envoyer."); } finally { setLoading(false); }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mb-8"><Mail className="w-8 h-8 text-green-500" /></div>
          <h2 className="text-[24px] font-extrabold text-gray-900 mb-2 tracking-tight">Email envoyé</h2>
          <p className="text-[13px] text-gray-400 mb-10">Lien envoyé à <span className="font-bold text-gray-700">{email}</span>.</p>
          <button onClick={onBack} className="w-full h-13 rounded-xl font-extrabold text-[13px] uppercase tracking-[0.12em] text-white active:scale-[0.97] transition" style={{ background: BRAND }}>Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center active:scale-95 transition"><ArrowLeft className="w-[18px] h-[18px] text-gray-400" /></button>
        <span className="text-[15px] font-bold text-gray-800">Mot de passe oublié</span>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <div className="text-center mt-8 mb-10">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ background: BRAND_LIGHT }}><Lock className="w-6 h-6" style={{ color: BRAND }} /></div>
          <h2 className="text-[26px] font-extrabold text-gray-900 leading-tight mb-2 tracking-tight">Récupérez<br />votre accès</h2>
          <p className="text-[13px] text-gray-400">On vous envoie un lien.</p>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.18em] mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 text-[14px] font-medium text-gray-800 outline-none focus:border-orange-200 focus:bg-white transition placeholder:text-gray-300" type="email" placeholder="vous@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-[12px] text-red-500 font-medium">{error}</p></div>}
        </div>

        <button onClick={handleSend} disabled={!email || loading} className="w-full h-13 rounded-xl font-extrabold text-[13px] uppercase tracking-[0.12em] text-white mb-8 active:scale-[0.97] transition-all" style={{ background: email && !loading ? BRAND : "#e5e7eb" }}>
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : "Envoyer"}
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

  useEffect(() => { const r = localStorage.getItem("bb_remember_email"); if (r) { setEmail(r); setRemember(true); } }, []);

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
          if (e.message?.includes('Email not confirmed')) { setEmailNotConfirmed(true); setError("Email non confirmé."); }
          else setError("Identifiants invalides.");
          setLoading(false); return;
        }
        if (data?.user) { try { await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: data.user.user_metadata?.full_name || email.split('@')[0], role: 'client', updated_at: new Date().toISOString() }, { onConflict: 'id' }); } catch {} ok = true; }
      }
    } catch { setError("Erreur de connexion."); } finally { setLoading(false); if (ok) navigate("/", { replace: true }); }
  };

  const handleResend = async () => {
    if (!email || resending) return; setResending(true);
    try { await supabase.auth.resend({ email, type: 'signup' }); setError("Email renvoyé."); setEmailNotConfirmed(false); } catch { setError("Erreur."); }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header orange accent */}
      <div className="h-1 w-full" style={{ background: BRAND }} />

      <div className="px-6 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center active:scale-95 transition mb-10">
          <ArrowLeft className="w-[18px] h-[18px] text-gray-400" />
        </button>
        <div className="flex items-center gap-3 mb-14">
          <B size={42} />
          <span className="text-gray-300 text-[12px] font-extrabold uppercase tracking-[0.3em]">BeautyBook</span>
        </div>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <h2 className="text-[30px] font-extrabold text-gray-900 leading-[1.05] mb-1.5 tracking-tight">Bon retour<br />parmi nous</h2>
        <p className="text-[13px] text-gray-400 mb-8">Connectez-vous pour accéder à votre espace.</p>

        <div className="space-y-4 flex-1">
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.18em] mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 text-[14px] font-medium text-gray-800 outline-none focus:border-orange-200 focus:bg-white transition placeholder:text-gray-300" type="email" placeholder="vous@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.18em] mb-2 block">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-11 text-[14px] font-medium text-gray-800 outline-none focus:border-orange-200 focus:bg-white transition placeholder:text-gray-300" type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"><EyeIcon show={showPwd} /></button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <button onClick={() => setRemember(!remember)} className="flex items-center gap-2.5 active:scale-95 transition">
              <div className={`w-[18px] h-[18px] rounded-md border-[1.5px] flex items-center justify-center transition-all ${remember ? "border-[#E8732A] bg-[#E8732A]" : "border-gray-200 bg-white"}`}>
                {remember && <svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-[12px] font-semibold text-gray-400">Rester connecté</span>
            </button>
            <button onClick={() => setShowForgot(true)} className="text-[12px] font-bold" style={{ color: BRAND }}>Mot de passe oublié ?</button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-[12px] text-red-500 font-medium">{error}</p>
              {emailNotConfirmed && <button onClick={handleResend} disabled={resending} className="text-[12px] font-bold underline" style={{ color: BRAND }}>{resending ? "Envoi..." : "Renvoyer"}</button>}
            </div>
          )}
        </div>

        <div className="pb-8 space-y-4">
          <button onClick={handleLogin} disabled={loading} className="w-full h-13 rounded-xl font-extrabold text-[13px] uppercase tracking-[0.12em] text-white active:scale-[0.97] transition-all flex items-center justify-center gap-2" style={{ background: BRAND }}>
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Se connecter</span><ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-center text-[13px] text-gray-400">
            Pas encore de compte ? <button onClick={() => { sessionStorage.removeItem("bb_signup_data"); sessionStorage.setItem("bb_from_login", "1"); navigate("/onboarding"); }} className="font-bold" style={{ color: BRAND }}>Créer un compte</button>
          </p>
        </div>
      </div>
    </div>
  );
}
