import { checkIfBanned } from "@/lib/adminUserManagement";
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Camera, RotateCcw, Check, ArrowLeft, ArrowRight, User, Mail, Lock, Sparkles } from "lucide-react";
import { entities, uploadFile } from '@/api/entities';
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { supabase } from '@/api/supabaseClient';
import { useRateLimit } from '@/hooks/useRateLimit';

const INTERESTS = ["COIFFURE", "MAQUILLAGE", "SOINS", "ONGLES", "MASSAGE", "BARBIER", "ÉPILATION"];

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step, total }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
          style={{ background: i < step ? "#E8732A" : "rgba(255,255,255,0.08)" }} />
      ))}
    </div>
  );
}

function StepLabel({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-[#E8732A]" />
      <span className="text-[10px] font-black text-[#E8732A] uppercase tracking-[0.2em]">
        Étape {step} / {total}
      </span>
    </div>
  );
}

// ── STEP 0 — Splash ───────────────────────────────────────────────────────────
function StepSplash({ onNext, onDiscover }) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#E8732A]/[0.04] blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#E8732A]/[0.03] blur-[100px]" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16 pb-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-16">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E8732A] to-[#d4651e] flex items-center justify-center shadow-lg shadow-[#E8732A]/20">
            <svg width="24" height="26" viewBox="0 0 42 46" fill="none">
              <rect x="2" y="2" width="22" height="21" rx="10" fill="white" opacity="0.9"/>
              <rect x="2" y="19" width="28" height="25" rx="12" fill="white"/>
              <circle cx="32" cy="8" r="5" fill="white"/>
            </svg>
          </div>
          <span className="text-white/30 text-[13px] font-black uppercase tracking-[0.3em]">BeautyBook</span>
        </div>

        {/* Main Text */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-[52px] font-black leading-[0.95] text-white uppercase tracking-tight mb-6">
            REVEAL<br />YOUR<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8732A] to-[#f4a261]">BEAUTY.</span>
          </h1>
          <p className="text-[15px] text-white/30 font-medium leading-relaxed max-w-[280px]">
            Rejoignez la première communauté dédiée à l'excellence esthétique.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <button
            onClick={onDiscover}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #E8732A, #d4651e)",
              boxShadow: "0 0 50px rgba(232,115,42,0.4)"
            }}
          >
            Commencer l'aventure
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── STEP 1 — Inscription ──────────────────────────────────────────────────────
function StepSignup({ onNext, onBack }) {
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", phone: "", password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mode, setMode] = useState("email");
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState({ code: "FR", flag: "🇫🇷", name: "France", dial: "+33" });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const { isLimited, remainingTime, checkLimit } = useRateLimit({ maxAttempts: 5, windowMs: 300000 });

  const pwdChecks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };
  const pwdScore = Object.values(pwdChecks).filter(Boolean).length;
  const pwdStrong = pwdScore >= 3;

  const [touched, setTouched] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const isValid = form.prenom && form.nom && form.email && pwdStrong && form.password === form.confirm && consentChecked;

  const handleSubmit = async () => {
    setTouched(true);
    if (!isValid) return;
    setError("");

    const banStatus = await checkIfBanned({ email: form.email });
    if (banStatus.isBanned) {
      setError(banStatus.reason || "🚫 Cet email ou cet appareil a été banni à vie par l'administration.");
      return;
    }

    sessionStorage.setItem("bb_signup_data", JSON.stringify({
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      phone: "",
      mode: "email",
      password: form.password,
    }));

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: `${form.prenom} ${form.nom}`,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already been registered')) {
          setError("Un compte existe déjà avec cet email. Connectez-vous.");
        } else if (signUpError.message?.includes('provider') || signUpError.message?.includes('not enabled')) {
          setError("Le provider Email n'est pas activé. Contactez le support.");
        } else {
          setError(signUpError.message || "Erreur lors de l'inscription.");
        }
        return;
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({ email: form.email });
      if (otpError) {
        console.warn("[Onboarding] OTP notice:", otpError);
      }

      onNext();
    } catch (e) {
      console.warn("[Onboarding] Sign up error:", e);
      setError("Erreur lors de l'inscription. Réessayez.");
    }
  };

  const handleSocialLogin = async (provider) => {
    if (form.email || form.prenom || form.nom) {
      const contact = mode === "email" ? form.email : `${selectedCountry.dial}${form.phone.replace(/\s/g, "")}`;
      sessionStorage.setItem("bb_signup_data", JSON.stringify({
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        phone: contact,
        mode,
      }));
    }
    sessionStorage.setItem("bb_social_signup", "1");
    try {
      const { isNativeApp, signInWithOAuthMobile, signInWithOAuthWeb } = await import('@/lib/oauth-mobile');
      if (isNativeApp()) {
        await signInWithOAuthMobile(provider);
      } else {
        await signInWithOAuthWeb(provider);
      }
    } catch (e) {
      console.error(`[${provider} Auth] Error:`, e);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[14px] font-medium text-white outline-none focus:border-[#E8732A]/50 focus:bg-white/[0.07] transition-all placeholder:text-white/20";
  const labelClass = "text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2 block";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E8732A]/[0.03] blur-[120px]" />

      <div className="relative z-10 px-6 pt-10 pb-8 flex flex-col flex-1">
        <div className="mb-8">
          <ProgressBar step={1} total={8} />
        </div>
        <StepLabel step={1} total={8} />

        <h2 className="text-[34px] font-black text-white leading-tight mb-2">Faisons<br />connaissance</h2>
        <p className="text-[14px] text-white/30 font-medium mb-8">Parlez-nous un peu de vous pour commencer l'aventure.</p>

        <div className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Prénom</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input className={inputClass + " pl-11"} placeholder="Sophie" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Nom</label>
              <input className={inputClass} placeholder="Martin" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Adresse e-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input className={inputClass + " pl-11"} type="email" placeholder="sophie.martin@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input className={inputClass + " pl-11 pr-12"} type={showPwd ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password.length > 0 && (
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
            <label className={labelClass}>Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input className={inputClass + " pl-11 pr-12"} type={showConfirm ? "text" : "password"} placeholder="••••••••" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
              <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* RGPD Consent */}
          <div
            onClick={() => setConsentChecked(!consentChecked)}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-start gap-3 cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className={`w-5 h-5 rounded-lg border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${consentChecked ? "bg-[#E8732A] border-[#E8732A]" : "border-white/20"}`}>
              {consentChecked && <Check className="w-3 h-3 text-white" />}
            </div>
            <p className="text-[12px] text-white/40 font-medium leading-relaxed">
              J'accepte les <span className="text-[#E8732A] font-bold">Conditions d'Utilisation</span> et la <span className="text-[#E8732A] font-bold">Politique de Confidentialité</span> de BeautyBook. Je consens au traitement de mes données conformément au RGPD.
            </p>
          </div>

          {touched && !isValid && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <p className="text-[12px] text-red-400 font-bold">
                {!form.prenom || !form.nom ? "Prénom et nom sont obligatoires." :
                 !form.email ? "Votre adresse email est obligatoire." :
                 !pwdStrong ? "Votre mot de passe n'est pas assez fort." :
                 form.password !== form.confirm ? "Les mots de passe ne correspondent pas." :
                 !consentChecked ? "Vous devez accepter les conditions." : ""}
              </p>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <p className="text-[12px] text-red-400 font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4 pb-4">
          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: isValid ? "linear-gradient(135deg, #E8732A, #d4651e)" : "rgba(255,255,255,0.06)",
              boxShadow: isValid ? "0 0 40px rgba(232,115,42,0.3)" : "none"
            }}
          >
            Suivant
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[13px] text-white/30 font-medium">
            Déjà un compte ?{" "}
            <Link to="/connexion" className="font-bold text-[#E8732A] hover:text-[#E8732A]/80 transition-colors">
              Se connecter
            </Link>
          </p>
          <button onClick={onBack} className="w-full text-center text-[11px] font-bold text-white/20 uppercase tracking-widest">Retour</button>
        </div>
      </div>
    </div>
  );
}

// ── STEP 2 — Vérification du code (email OU téléphone) ──────────────────────
function StepVerification({ onNext, onBack }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [clipboardToast, setClipboardToast] = useState(false);
  const [resendTimer, setResendTimer] = useState(45);
  const inputs = useRef([]);
  const timerRef = useRef(null);

  const [data, setData] = useState(() => JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}"));
  const contact = data.mode === "email" ? data.email : data.phone;
  const maskedContact = data.mode === "email"
    ? contact?.replace(/(.{2}).+(@.+)/, "$1***$2")
    : contact?.replace(/.(?=.{4})/g, "*");

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const tryReadClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          const digits = text.replace(/\D/g, "").slice(0, 6);
          if (digits.length === 6) {
            const arr = digits.split("");
            setCode(arr);
            setClipboardToast(true);
            setTimeout(() => setClipboardToast(false), 2500);
            handleCodeComplete(arr);
          }
        }
      } catch (_) {}
    };
    setTimeout(tryReadClipboard, 600);
  }, []);

  const [smsSent, setSmsSent] = useState(false);

  useEffect(() => {
    const sendCode = async () => {
      let currentData = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");
      const isSocial = sessionStorage.getItem("bb_social_signup_processed") === "1";

      if (isSocial) {
        let user = null;
        for (let i = 0; i < 8; i++) {
          user = await supabase.auth.getUser().then(({ data }) => data?.user).catch(() => null);
          if (user?.email) break;
          await new Promise(r => setTimeout(r, 750));
        }
        if (user?.email) {
          currentData = { ...currentData, email: user.email, mode: "email" };
          sessionStorage.setItem("bb_signup_data", JSON.stringify(currentData));
          setData(currentData);
        }
      }

      const isPhone = currentData.mode === "phone";

      if (isPhone && currentData.phone) {
        try {
          const { error } = await supabase.auth.signInWithOtp({ phone: currentData.phone });
          if (error) {
            console.warn('[Verification] SMS failed:', error.message);
          } else {
            setSmsSent(true);
            console.log('[Verification] SMS envoyé à:', currentData.phone);
          }
        } catch (e) {
          console.warn('[Verification] SMS error:', e);
        }
        return;
      }
    };

    sendCode();
  }, []);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputs.current[5]?.focus();
    }
  };

  const fullCode = code.join("");

  const handleVerify = async () => {
    if (fullCode.length < 6 || loading) return;
    setLoading(true);
    setError("");
    const currentData = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");

    if (currentData.mode === "phone") {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: currentData.phone,
        token: fullCode,
        type: 'sms',
      });

      if (verifyError) {
        setError("Code incorrect ou expiré. Réessayez.");
        setCode(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        setLoading(false);
        return;
      }
      onNext();
      setLoading(false);
      return;
    }

    const email = currentData.email;
    if (!email) { setError("Email introuvable. Recommencez depuis le début."); setLoading(false); return; }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: fullCode,
      type: 'email',
    });

    if (verifyError) {
      setError("Code incorrect ou expiré. Vérifiez le code reçu par email.");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } else {
      const user = await supabase.auth.getUser().then(({ data }) => data?.user).catch(() => null);
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: `${currentData.prenom || ""} ${currentData.nom || ""}`.trim(),
          role: 'user',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
      onNext();
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResending(true);
    setError("");
    const currentData = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");
    if (currentData.mode === "phone") {
      try {
        const { error } = await supabase.auth.signInWithOtp({ phone: currentData.phone });
        if (!error) setSmsSent(true);
      } catch {}
    } else if (currentData.email) {
      try {
        await supabase.auth.signInWithOtp({ email: currentData.email });
      } catch {}
    }
    setResending(false);
    setResendTimer(45);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E8732A]/[0.03] blur-[120px]" />

      <div className="relative z-10 px-6 pt-10 pb-8 flex flex-col flex-1">
        <div className="mb-8"><ProgressBar step={2} total={8} /></div>
        <StepLabel step={2} total={8} />

        <h2 className="text-[34px] font-black text-white leading-tight mb-2">Vérifiez<br />votre {data.mode === "email" ? "email" : "numéro"}</h2>
        <p className="text-[14px] text-white/30 font-medium mb-10">
          Nous avons envoyé un code à 6 chiffres à{" "}
          <span className="text-white font-bold">{maskedContact}</span>
        </p>

        <div className="flex-1 flex flex-col items-center gap-6 pt-4">
          {clipboardToast && (
            <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[12px] font-bold px-4 py-2.5 rounded-2xl flex items-center gap-2">
              Code collé depuis le presse-papier !
            </div>
          )}

          {data.mode === "phone" && smsSent && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[13px] font-bold">SMS envoyé avec succès</span>
            </div>
          )}

          {/* Code input */}
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-[24px] font-black bg-white/5 rounded-2xl outline-none transition-all text-[#E8732A]"
                style={{
                  border: digit ? "2px solid #E8732A" : "2px solid rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 w-full text-center">
              <p className="text-[13px] text-red-400 font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resendTimer > 0 || resending}
            className={`flex items-center gap-2 text-[12px] font-bold active:scale-95 transition-all ${resendTimer > 0 ? 'text-white/20' : 'text-[#E8732A]'}`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            {resendTimer > 0
              ? `Renvoyer le code dans ${resendTimer}s`
              : resending ? "Envoi en cours..." : "Renvoyer le code"
            }
          </button>
        </div>

        <div className="space-y-3 mt-6">
          <button
            onClick={handleVerify}
            disabled={fullCode.length < 6 || loading}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: fullCode.length === 6 && !loading ? "linear-gradient(135deg, #E8732A, #d4651e)" : "rgba(255,255,255,0.06)",
              boxShadow: fullCode.length === 6 ? "0 0 40px rgba(232,115,42,0.3)" : "none"
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Confirmer
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button onClick={onBack} className="w-full text-center text-[11px] font-bold text-white/20 uppercase tracking-widest">Retour</button>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3 — Profil Beauté ────────────────────────────────────────────────────
function StepBeautyProfile({ onNext, onBack }) {
  const [gender, setGender] = useState(null);
  const [interests, setInterests] = useState([]);

  const toggleInterest = (item) => {
    setInterests(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const isValid = !!gender && interests.length >= 1;

  const handleContinue = () => {
    if (!isValid) return;
    const existing = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");
    sessionStorage.setItem("bb_signup_data", JSON.stringify({ ...existing, gender, interests }));
    onNext();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E8732A]/[0.03] blur-[120px]" />

      <div className="relative z-10 px-6 pt-10 pb-8 flex flex-col flex-1">
        <div className="mb-8"><ProgressBar step={3} total={8} /></div>
        <StepLabel step={3} total={8} />

        <h2 className="text-[34px] font-black text-white leading-tight mb-2">Votre Profil<br />Beauté</h2>
        <p className="text-[14px] text-white/30 font-medium mb-8">Ces détails nous aident à personnaliser votre feed.</p>

        <div className="flex-1 space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Vous êtes ?</p>
              <span className="text-[9px] font-bold text-[#E8732A] uppercase tracking-widest">* Obligatoire</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {["FEMME", "HOMME", "AUTRE"].map(g => (
                <button key={g} onClick={() => setGender(g)}
                  className="px-6 py-3.5 rounded-2xl text-[12px] font-black border-2 transition-all active:scale-95 uppercase tracking-widest"
                  style={{
                    borderColor: gender === g ? "#E8732A" : "rgba(255,255,255,0.1)",
                    background: gender === g ? "#E8732A" : "rgba(255,255,255,0.03)",
                    color: gender === g ? "white" : "rgba(255,255,255,0.5)",
                    boxShadow: gender === g ? "0 0 30px rgba(232,115,42,0.3)" : "none"
                  }}>
                  {g}
                </button>
              ))}
            </div>
            {!gender && <p className="text-[11px] text-[#E8732A]/60 font-medium mt-3">Veuillez sélectionner une option</p>}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Vos intérêts</p>
              <span className="text-[9px] font-bold text-[#E8732A] uppercase tracking-widest">* Au moins 1</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {INTERESTS.map(item => (
                <button key={item} onClick={() => toggleInterest(item)}
                  className="px-5 py-3 rounded-2xl text-[12px] font-black border-2 transition-all active:scale-95 uppercase tracking-widest"
                  style={{
                    borderColor: interests.includes(item) ? "#E8732A" : "rgba(255,255,255,0.1)",
                    background: interests.includes(item) ? "#E8732A" : "rgba(255,255,255,0.03)",
                    color: interests.includes(item) ? "white" : "rgba(255,255,255,0.5)",
                    boxShadow: interests.includes(item) ? "0 0 30px rgba(232,115,42,0.3)" : "none"
                  }}>
                  {item}
                </button>
              ))}
            </div>
            {interests.length === 0 && <p className="text-[11px] text-[#E8732A]/60 font-medium mt-3">Sélectionnez au moins un intérêt</p>}
          </div>
        </div>

        <div className="mt-6 space-y-3 pb-4">
          <button
            onClick={handleContinue}
            disabled={!isValid}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{
              background: isValid ? "linear-gradient(135deg, #E8732A, #d4651e)" : "rgba(255,255,255,0.06)",
              boxShadow: isValid ? "0 0 40px rgba(232,115,42,0.3)" : "none"
            }}
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onBack} className="w-full text-center text-[11px] font-bold text-white/20 uppercase tracking-widest">Retour</button>
        </div>
      </div>
    </div>
  );
}

// ── STEP 4 — Photo de profil + Bannière ──────────────────────────────────────
function StepPhoto({ onNext, onBack }) {
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [banner, setBanner] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const photoRef = useRef(null);
  const bannerRef = useRef(null);

  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); setPhoto(URL.createObjectURL(file)); }
  };

  const handleBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (file) { setBannerFile(file); setBanner(URL.createObjectURL(file)); }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const data = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        id: user.id,
        email: user.email,
        gender: data.gender || null,
        beauty_interests: data.interests || [],
        full_name: [data.prenom, data.nom].filter(Boolean).join(' ') || user.user_metadata?.full_name || '',
        role: 'user',
        updated_at: new Date().toISOString(),
      };

      if (photoFile) {
        try {
          const { file_url } = await uploadFile({ file: photoFile });
          updates.avatar_url = file_url;
        } catch (e) { console.error('[StepPhoto] Upload avatar failed:', e); }
      }

      if (bannerFile) {
        try {
          const { file_url } = await uploadFile({ file: bannerFile });
          updates.cover_url = file_url;
        } catch (e) { console.error('[StepPhoto] Upload banner failed:', e); }
      }

      const { error } = await supabase.from('profiles').upsert(updates, { onConflict: 'id' });
      if (error) console.error('[StepPhoto] Profile upsert error:', error);

      await supabase.auth.updateUser({
        data: { full_name: updates.full_name, gender: updates.gender, beauty_interests: updates.beauty_interests }
      });
    } catch (e) {
      console.error('[StepPhoto] Error:', e);
    } finally {
      setLoading(false);
      onNext();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E8732A]/[0.03] blur-[120px]" />

      <div className="relative z-10 px-6 pt-10 pb-8 flex flex-col flex-1">
        <div className="mb-8"><ProgressBar step={4} total={8} /></div>
        <StepLabel step={4} total={8} />

        <h2 className="text-[34px] font-black text-white leading-tight mb-2">Personnalisez<br />votre profil</h2>
        <p className="text-[14px] text-white/30 font-medium mb-8">Ajoutez une photo et une bannière pour vous identifier.</p>

        <div className="flex-1 space-y-6">
          {/* Banner */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Bannière de profil</p>
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Optionnelle</span>
            </div>
            <div
              onClick={() => bannerRef.current?.click()}
              className="relative w-full h-32 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all border-2 border-dashed"
              style={{ borderColor: banner ? "#E8732A" : "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
            >
              {banner ? (
                <img src={banner} alt="Bannière" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Camera className="w-8 h-8 text-white/15" strokeWidth={1} />
                  <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Ajouter une bannière</span>
                </div>
              )}
            </div>
            <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />
          </div>

          {/* Avatar */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Photo de profil</p>
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Optionnelle</span>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative">
                <div
                  onClick={() => photoRef.current?.click()}
                  className="w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed cursor-pointer"
                  style={{ borderColor: photo ? "#E8732A" : "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
                  {photo ? (
                    <img src={photo} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-white/15" strokeWidth={1} />
                  )}
                </div>
                <button onClick={() => photoRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
                  style={{ background: "#E8732A" }}>
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
                <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-white">Photo de profil</p>
                <p className="text-[12px] text-white/30 font-medium mt-1">Visible par la communauté</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 mt-6 pb-4">
          <button onClick={handleFinish} disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{
              background: !loading ? "linear-gradient(135deg, #E8732A, #d4651e)" : "rgba(255,255,255,0.06)",
              boxShadow: !loading ? "0 0 40px rgba(232,115,42,0.3)" : "none"
            }}>
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Terminer mon profil
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button onClick={onBack} className="w-full text-center text-[11px] font-bold text-white/20 uppercase tracking-widest">Retour</button>
        </div>
      </div>
    </div>
  );
}

// ── STEP 5 — Success ──────────────────────────────────────────────────────────
function StepSuccess({ onDone }) {
  const data = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");
  const prenom = data.prenom || "";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#E8732A]/[0.05] blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#E8732A]/[0.03] blur-[100px]" />

      <div className="relative z-10 text-center">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#E8732A] to-[#d4651e] flex items-center justify-center mb-10 shadow-2xl shadow-[#E8732A]/30">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-[42px] font-black text-white leading-tight mb-4">
          {prenom ? `Bienvenue\n${prenom} !` : "Bienvenue !"}
        </h2>
        <p className="text-[15px] text-white/30 font-medium leading-relaxed max-w-[280px] mx-auto">
          Votre profil est prêt. Bienvenue dans la communauté BeautyBook.
        </p>
      </div>

      <div className="relative z-10 w-full mt-16">
        <button onClick={onDone}
          className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #E8732A, #d4651e)",
            boxShadow: "0 0 50px rgba(232,115,42,0.4)"
          }}>
          Découvrir BeautyBook
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── STEP 6 — Autorisation Notifications ──────────────────────────────────────
function StepNotifications({ onNext }) {
  const [status, setStatus] = useState('idle');

  const handleAllow = async () => {
    if (!('Notification' in window)) { setStatus('unavailable'); setTimeout(onNext, 1500); return; }
    if (Notification.permission === 'granted') { setStatus('granted'); setTimeout(onNext, 800); return; }
    setStatus('loading');
    try {
      const result = await Notification.requestPermission();
      setStatus(result === 'granted' ? 'granted' : 'denied');
    } catch (_) { setStatus('denied'); }
    setTimeout(onNext, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E8732A]/[0.03] blur-[120px]" />

      <div className="relative z-10 px-6 pt-10 pb-8 flex flex-col flex-1">
        <div className="mb-8"><ProgressBar step={5} total={8} /></div>
        <StepLabel step={5} total={8} />

        <div className="flex-1 flex flex-col items-center justify-center text-center gap-10">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#E8732A]/20 to-[#E8732A]/5 border border-[#E8732A]/30 flex items-center justify-center">
            <span className="text-[56px]">🔔</span>
          </div>
          <div>
            <h2 className="text-[36px] font-black text-white leading-tight mb-4">Notifications</h2>
            <p className="text-[15px] text-white/30 font-medium leading-relaxed max-w-[320px] mx-auto">
              Recevez des alertes pour vos réservations, messages et offres exclusives.
            </p>
          </div>
          {status === 'granted' && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-5 py-3 rounded-2xl">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 text-[13px] font-bold">Notifications activées</span>
            </div>
          )}
          {status === 'denied' && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-5 py-3 rounded-2xl">
              <span className="text-red-400 text-[20px]">✕</span>
              <span className="text-red-400 text-[13px] font-bold">Autorisation refusée</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {status === 'idle' || status === 'loading' ? (
            <button onClick={handleAllow} disabled={status === 'loading'}
              className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #E8732A, #d4651e)",
                boxShadow: "0 0 40px rgba(232,115,42,0.3)"
              }}>
              {status === 'loading' ? "En attente..." : "Activer les notifications"}
            </button>
          ) : null}
          <button onClick={onNext} className="w-full py-3 text-center text-[12px] font-bold text-white/20 uppercase tracking-widest active:scale-95 transition-all">
            Passer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── STEP 7 — Autorisation Localisation ───────────────────────────────────────
function StepLocation({ onNext }) {
  const [status, setStatus] = useState('idle');

  const handleAllow = async () => {
    if (!navigator.geolocation) { setStatus('unavailable'); setTimeout(onNext, 1500); return; }
    setStatus('loading');
    try {
      const result = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          () => resolve('denied'),
          { timeout: 10000 }
        );
      });
      setStatus(result);
      if (result === 'granted') {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').upsert({
              id: user.id, latitude: pos.coords.latitude, longitude: pos.coords.longitude, updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          }
        }, () => {}, { enableHighAccuracy: false });
      }
    } catch (_) { setStatus('denied'); }
    setTimeout(onNext, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E8732A]/[0.03] blur-[120px]" />

      <div className="relative z-10 px-6 pt-10 pb-8 flex flex-col flex-1">
        <div className="mb-8"><ProgressBar step={6} total={8} /></div>
        <StepLabel step={6} total={8} />

        <div className="flex-1 flex flex-col items-center justify-center text-center gap-10">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#E8732A]/20 to-[#E8732A]/5 border border-[#E8732A]/30 flex items-center justify-center">
            <span className="text-[56px]">📍</span>
          </div>
          <div>
            <h2 className="text-[36px] font-black text-white leading-tight mb-4">Localisation</h2>
            <p className="text-[15px] text-white/30 font-medium leading-relaxed max-w-[320px] mx-auto">
              Trouvez les salons et professionnels beauté les plus proches de chez vous.
            </p>
          </div>
          {status === 'granted' && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-5 py-3 rounded-2xl">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 text-[13px] font-bold">Localisation activée</span>
            </div>
          )}
          {status === 'denied' && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-5 py-3 rounded-2xl">
              <span className="text-red-400 text-[20px]">✕</span>
              <span className="text-red-400 text-[13px] font-bold">Autorisation refusée</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {status === 'idle' || status === 'loading' ? (
            <button onClick={handleAllow} disabled={status === 'loading'}
              className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #E8732A, #d4651e)",
                boxShadow: "0 0 40px rgba(232,115,42,0.3)"
              }}>
              {status === 'loading' ? "En attente..." : "Activer la localisation"}
            </button>
          ) : null}
          <button onClick={onNext} className="w-full py-3 text-center text-[12px] font-bold text-white/20 uppercase tracking-widest active:scale-95 transition-all">
            Passer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── STEP 8 — Autorisation Caméra & Micro ─────────────────────────────────────
function StepCameraMic({ onNext }) {
  const [camStatus, setCamStatus] = useState('idle');
  const [micStatus, setMicStatus] = useState('idle');

  const handleAllow = async () => {
    setCamStatus('loading');
    setMicStatus('loading');

    try {
      const stream = await navigator.mediaDevices?.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCamStatus('granted');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').upsert({ id: user.id, camera_enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    } catch (_) { setCamStatus('denied'); }

    try {
      const stream = await navigator.mediaDevices?.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicStatus('granted');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').upsert({ id: user.id, mic_enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    } catch (_) { setMicStatus('denied'); }

    setTimeout(onNext, 1200);
  };

  const isIdle = camStatus === 'idle';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1208] to-[#0f0f0f] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E8732A]/[0.03] blur-[120px]" />

      <div className="relative z-10 px-6 pt-10 pb-8 flex flex-col flex-1">
        <div className="mb-8"><ProgressBar step={7} total={8} /></div>
        <StepLabel step={7} total={8} />

        <div className="flex-1 flex flex-col items-center justify-center text-center gap-10">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#E8732A]/20 to-[#E8732A]/5 border border-[#E8732A]/30 flex items-center justify-center">
            <span className="text-[56px]">📸</span>
          </div>
          <div>
            <h2 className="text-[36px] font-black text-white leading-tight mb-4">Caméra & Micro</h2>
            <p className="text-[15px] text-white/30 font-medium leading-relaxed max-w-[320px] mx-auto">
              Prenez des photos, enregistrez des reels et utilisez l'assistant vocal.
            </p>
          </div>
          <div className="flex gap-3">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all ${camStatus === 'granted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : camStatus === 'denied' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/30 border border-white/10'}`}>
              📷 {camStatus === 'granted' ? 'Activé' : camStatus === 'denied' ? 'Refusé' : 'Caméra'}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all ${micStatus === 'granted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : micStatus === 'denied' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/30 border border-white/10'}`}>
              🎙️ {micStatus === 'granted' ? 'Activé' : micStatus === 'denied' ? 'Refusé' : 'Micro'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {isIdle ? (
            <button onClick={handleAllow}
              className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #E8732A, #d4651e)",
                boxShadow: "0 0 40px rgba(232,115,42,0.3)"
              }}>
              Autoriser l'accès
            </button>
          ) : null}
          <button onClick={onNext} className="w-full py-3 text-center text-[12px] font-bold text-white/20 uppercase tracking-widest active:scale-95 transition-all">
            Passer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Onboarding ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    if (sessionStorage.getItem("bb_social_signup") === "1") {
      sessionStorage.removeItem("bb_social_signup");
      sessionStorage.setItem("bb_social_signup_processed", "1");
      return 2;
    }
    if (sessionStorage.getItem("bb_from_login") === "1") {
      sessionStorage.removeItem("bb_from_login");
      return 1;
    }
    return 0;
  });

  const done = () => {
    localStorage.setItem("bb_onboarded", "1");
    localStorage.removeItem("bb_is_pro");
    sessionStorage.removeItem("bb_signup_data");
    sessionStorage.removeItem("bb_social_signup_processed");
    window.location.href = "/";
  };

  const handleSignupNext = () => {
    setStep(2);
  };

  return (
    <div className="font-display relative">
      {step === 0 && <StepSplash onNext={() => setStep(1)} onDiscover={done} />}
      {step === 1 && <StepSignup onNext={handleSignupNext} onBack={() => setStep(0)} />}
      {step === 2 && <StepVerification onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <StepBeautyProfile onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <StepPhoto onNext={done} onBack={() => setStep(3)} />}
      {step === 8 && <StepSuccess onDone={done} />}

      {step !== 0 && step !== 8 && (
        <button
          onClick={() => {
            if (step === 1) navigate(-1);
            else if (step === 2) setStep(1);
            else if (step === 3) setStep(2);
            else if (step === 4) setStep(3);
          }}
          className="fixed bottom-6 left-6 w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all z-50"
        >
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
      )}
    </div>
  );
}
