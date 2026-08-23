import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Camera, RotateCcw, Check } from "lucide-react";
import { entities, uploadFile } from '@/api/entities';
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { supabase } from '@/api/supabaseClient';
import { useRateLimit } from '@/hooks/useRateLimit';

const SPLASH_IMG = "https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/39cb4873a_generated_image.png";
const LOGO_IMG = "https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/47f6dcd4b_generated_image.png";

const INTERESTS = ["COIFFURE", "MAQUILLAGE", "SOINS", "ONGLES", "MASSAGE", "BARBIER", "ÉPILATION"];

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step, total }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
          style={{ background: i < step ? "#E8732A" : "#e5e7eb" }} />
      ))}
    </div>
  );
}

function StepLabel({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-2 h-2 rounded-full bg-primary" />
      <span className="text-[11px] font-black text-primary uppercase tracking-widest">
        Étape {step} / {total}
      </span>
    </div>
  );
}

// ── STEP 0 — Splash ───────────────────────────────────────────────────────────
function StepSplash({ onNext, onDiscover }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Full background image */}
      <div className="absolute inset-0">
        <img src={SPLASH_IMG} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,20,20,0.3) 0%, rgba(15,15,15,0.92) 55%, rgba(10,10,10,0.98) 100%)" }} />
      </div>

      {/* Logo top-center — sans fond, intégré dans l'image */}
      <div className="relative z-10 flex justify-center pt-14">
        <div className="flex flex-col items-center gap-3">
          {/* Logo SVG inline — neutre, sans fond */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="36" cy="36" r="34" stroke="#E8732A" strokeWidth="2.5" fill="none" opacity="0.3"/>
            <path d="M22 20h16c5.523 0 10 4.477 10 10s-4.477 10-10 10H22V20z" fill="#E8732A" opacity="0.85"/>
            <path d="M22 40h18c5.523 0 10 4.477 10 10s-4.477 10-10 10H22V40z" fill="#E8732A"/>
            <circle cx="52" cy="24" r="4" fill="white" opacity="0.9"/>
          </svg>
          <span className="text-white text-[15px] font-black uppercase tracking-[0.25em]" style={{ textShadow: "0 2px 12px rgba(232,115,42,0.8)" }}>BeautyBook</span>
        </div>
      </div>

      {/* Bottom content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-12">
        <h1 className="text-[56px] font-black leading-none text-white uppercase tracking-tight mb-1">
          REVEAL<br />YOUR<br />
          <span style={{ color: "#E8732A" }}>BEAUTY.</span>
        </h1>
        <p className="text-[15px] text-white/60 font-medium mt-4 mb-8 leading-relaxed max-w-[300px]">
          Rejoignez la première communauté dédiée à l'excellence esthétique.
        </p>
        <button
          onClick={onNext}
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg"
          style={{ background: "#E8732A", boxShadow: "0 0 40px rgba(232,115,42,0.5)" }}
        >
          Commencer l'aventure
        </button>
        <button
          onClick={onDiscover}
          className="w-full py-3.5 mt-3 rounded-full font-black text-[12px] uppercase tracking-widest text-white/60 active:scale-95 transition-all border border-white/15"
        >
          Continuer l'aventure
        </button>
      </div>
    </div>
  );
}

// ── STEP 1 — Inscription ──────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "FR", flag: "🇫🇷", name: "France", dial: "+33" },
  { code: "BE", flag: "🇧🇪", name: "Belgique", dial: "+32" },
  { code: "CH", flag: "🇨🇭", name: "Suisse", dial: "+41" },
  { code: "CA", flag: "🇨🇦", name: "Canada", dial: "+1" },
  { code: "US", flag: "🇺🇸", name: "États-Unis", dial: "+1" },
  { code: "GB", flag: "🇬🇧", name: "Royaume-Uni", dial: "+44" },
  { code: "DE", flag: "🇩🇪", name: "Allemagne", dial: "+49" },
  { code: "ES", flag: "🇪🇸", name: "Espagne", dial: "+34" },
  { code: "IT", flag: "🇮🇹", name: "Italie", dial: "+39" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", dial: "+351" },
  { code: "NL", flag: "🇳🇱", name: "Pays-Bas", dial: "+31" },
  { code: "MA", flag: "🇲🇦", name: "Maroc", dial: "+212" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal", dial: "+221" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire", dial: "+225" },
  { code: "CM", flag: "🇨🇲", name: "Cameroun", dial: "+237" },
  { code: "TG", flag: "🇹🇬", name: "Togo", dial: "+228" },
  { code: "BJ", flag: "🇧🇯", name: "Bénin", dial: "+229" },
  { code: "ML", flag: "🇲🇱", name: "Mali", dial: "+223" },
  { code: "NE", flag: "🇳🇪", name: "Niger", dial: "+227" },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso", dial: "+226" },
  { code: "GN", flag: "🇬🇳", name: "Guinée", dial: "+224" },
  { code: "CD", flag: "🇨🇩", name: "RD Congo", dial: "+243" },
  { code: "CG", flag: "🇨🇬", name: "Congo", dial: "+242" },
  { code: "GA", flag: "🇬🇦", name: "Gabon", dial: "+241" },
  { code: "MG", flag: "🇲🇬", name: "Madagascar", dial: "+261" },
  { code: "RE", flag: "🇷🇪", name: "Réunion", dial: "+262" },
  { code: "GP", flag: "🇬🇵", name: "Guadeloupe", dial: "+590" },
  { code: "MQ", flag: "🇲🇶", name: "Martinique", dial: "+596" },
  { code: "NC", flag: "🇳🇨", name: "Nouvelle-Calédonie", dial: "+687" },
  { code: "PF", flag: "🇵🇫", name: "Polynésie", dial: "+689" },
  { code: "HT", flag: "🇭🇹", name: "Haïti", dial: "+509" },
  { code: "MU", flag: "🇲🇺", name: "Maurice", dial: "+230" },
  { code: "TN", flag: "🇹🇳", name: "Tunisie", dial: "+216" },
  { code: "DZ", flag: "🇩🇿", name: "Algérie", dial: "+213" },
  { code: "EG", flag: "🇪🇬", name: "Égypte", dial: "+20" },
  { code: "AE", flag: "🇦🇪", name: "Émirats", dial: "+971" },
  { code: "SA", flag: "🇸🇦", name: "Arabie Saoudite", dial: "+966" },
];

function StepSignup({ onNext, onBack }) {
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", phone: "", password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mode, setMode] = useState("email");
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const { isLimited, remainingTime, checkLimit } = useRateLimit({ maxAttempts: 5, windowMs: 300000 });

  const inputClass = "w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-gray-400";
  const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block";

  // Robustesse du mot de passe
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
    if (!checkLimit()) {
      setError(`Trop de tentatives. Réessayez dans ${remainingTime}s.`);
      return;
    }
    setError("");

    // Vérifier si un compte existe déjà (profiles table)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', form.email)
      .single();

    if (existingProfile) {
      setError("Cette adresse email possède déjà un compte. Veuillez vous connecter.");
      return;
    }

    // Créer le compte Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
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
        setError("Cette adresse email possède déjà un compte. Veuillez vous connecter.");
        return;
      }
      throw signUpError;
    }

    // Tenter de se connecter immédiatement (si l'email est déjà confirmé, ex: Supabase sans confirmation)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (!signInError) {
      // Connexion réussie → le compte est confirmé, créer le profil et continuer
      if (signUpData?.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          email: form.email,
          full_name: `${form.prenom} ${form.nom}`,
          role: 'user',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
      localStorage.setItem("bb_onboarded", "1");
      sessionStorage.setItem("bb_signup_data", JSON.stringify({
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        phone: "",
        mode: "email",
      }));
      onNext();
      return;
    }

    // La connexion a échoué → probablement parce que l'email n'est pas encore confirmé.
    // Envoyer un OTP de vérification par email.
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: form.email });
    if (otpError) {
      console.error('[Onboarding] signInWithOtp error:', otpError);
      setError("Erreur lors de l'envoi du code de vérification. Vérifiez votre adresse email.");
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
    onNext();
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

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-10 pb-8">
      <ProgressBar step={1} total={8} />
      <StepLabel step={1} total={8} />

      <h2 className="text-[34px] font-black text-gray-900 leading-tight mb-1">Faisons<br />connaissance</h2>
      <p className="text-[13px] text-gray-400 font-medium mb-6">Parlez-nous un peu de vous pour commencer l'aventure.</p>

      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Prénom</label>
            <input className={inputClass} placeholder="Sophie" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Nom</label>
            <input className={inputClass} placeholder="Martin" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
          </div>
        </div>

        {/* Email only — phone hidden */}
        <div>
          <label className={labelClass}>Adresse e-mail</label>
          <input className={inputClass} type="email" placeholder="sophie.martin@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        <div>
          <label className={labelClass}>Mot de passe</label>
          <div className="relative">
            <input className={inputClass + " pr-12"} type={showPwd ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <button onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.password.length > 0 && (
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
            <input className={inputClass + " pr-12"} type={showConfirm ? "text" : "password"} placeholder="••••••••" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
            <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* RGPD Consent */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div onClick={() => setConsentChecked(!consentChecked)} className="flex items-start gap-3 cursor-pointer">
            <div className={`w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${consentChecked ? "bg-primary border-primary" : "border-gray-300"}`}>
              {consentChecked && <Check className="w-3 h-3 text-white" />}
            </div>
            <p className="text-[12px] text-gray-500 font-medium leading-relaxed">
              J'accepte les <span className="text-primary font-bold">Conditions d'Utilisation</span> et la <span className="text-primary font-bold">Politique de Confidentialité</span> de BeautyBook. Je consens au traitement de mes données conformément au RGPD.
            </p>
          </div>
        </div>

        {touched && !isValid && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <p className="text-[12px] text-red-500 font-bold">
              {!form.prenom || !form.nom ? "Prénom et nom sont obligatoires." :
               !form.email ? "Votre adresse email est obligatoire." :
               !pwdStrong ? "Votre mot de passe n'est pas assez fort." :
               form.password !== form.confirm ? "Les mots de passe ne correspondent pas." : ""}
            </p>
          </div>
        )}
        {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
      </div>

      <div className="mt-6 space-y-4">
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-95"
          style={{ background: isValid ? "#E8732A" : "#d1d5db" }}
        >
          Suivant
        </button>

        <p className="text-center text-[12px] text-gray-400 font-medium">
          Déjà un compte ?{" "}
          <Link to="/connexion" className="font-black" style={{ color: "#E8732A" }}>
            Se connecter
          </Link>
        </p>
        <button onClick={onBack} className="w-full text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">Retour</button>
      </div>
    </div>
  );
}

// ── STEP 1b — Vérifiez vos SMS (supprimé — fusionné dans StepVerification) ───

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

  // Lire le presse-papier automatiquement à l'arrivée
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
            // Auto-verify
            handleCodeComplete(arr);
          }
        }
      } catch (_) {
        // Permission refusée ou non supporté — silencieux
      }
    };
    // Délai léger pour laisser le composant se monter
    setTimeout(tryReadClipboard, 600);
  }, []);

  const [smsSent, setSmsSent] = useState(false);

  // Envoyer le code automatiquement à l'arrivée sur cette étape
  useEffect(() => {
    const sendCode = async () => {
      let currentData = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");
      const isSocial = sessionStorage.getItem("bb_social_signup_processed") === "1";

      // Pour OAuth social : TOUJOURS l'email du compte Google sélectionné
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

      // Mode téléphone : envoyer SMS via Supabase
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

      // Mode email : le code OTP a déjà été envoyé par signUp() — rien à faire ici
      // On attend simplement que l'utilisateur entre le code
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

    // Mode téléphone : vérification Supabase
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

    // Mode email : vérification Supabase
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
      // OTP vérifié — le compte est confirmé
      // Créer le profil
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
        if (!error) {
          setSmsSent(true);
        }
      } catch {
        // Erreur silencieuse
      }
    } else if (currentData.email) {
      try {
        await supabase.auth.signInWithOtp({ email: currentData.email });
      } catch {
        // Erreur silencieuse
      }
    }
    setResending(false);
    setResendTimer(45);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChangeAuto = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-10 pb-8">
      <ProgressBar step={2} total={8} />
      <StepLabel step={2} total={8} />

      <h2 className="text-[34px] font-black text-gray-900 leading-tight mb-1">Vérifiez<br />votre {data.mode === "email" ? "email" : "numéro"}</h2>
      <p className="text-[13px] text-gray-400 font-medium mb-8">
        Nous avons envoyé un code à 6 chiffres à{" "}
        <span className="font-black text-gray-700">{maskedContact}</span>
      </p>

      <div className="flex-1 flex flex-col items-center gap-6 pt-4">
        {/* Toast presse-papier */}
        {clipboardToast && (
          <div className="bg-green-500 text-white text-[12px] font-black px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg">
            <span>📋</span> Code collé depuis le presse-papier !
          </div>
        )}

        {/* SMS envoyé avec succès */}
        {data.mode === "phone" && smsSent && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-2xl px-4 py-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
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
              onChange={e => handleChangeAuto(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-[24px] font-black bg-gray-100 rounded-2xl outline-none transition-all"
              style={{
                border: digit ? "2px solid #E8732A" : "2px solid transparent",
                color: "#E8732A"
              }}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 w-full text-center">
            <p className="text-[13px] text-red-500 font-bold">{error}</p>
          </div>
        )}

        {/* Resend */}
        <button
          onClick={handleResend}
          disabled={resendTimer > 0 || resending}
          className={`flex items-center gap-2 text-[12px] font-black active:scale-95 transition-all ${resendTimer > 0 ? 'text-gray-400 opacity-50' : 'text-[#E8732A]'}`}
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
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-95"
          style={{ background: fullCode.length === 6 && !loading ? "#E8732A" : "#d1d5db" }}
        >
          {loading ? "Vérification..." : "Confirmer"}
        </button>
        <button onClick={onBack} className="w-full text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">Retour</button>
      </div>
    </div>
  );
}

// ── STEP 2 — Profil Beauté ────────────────────────────────────────────────────
function StepBeautyProfile({ onNext, onBack }) {
  const [gender, setGender] = useState(null);
  const [interests, setInterests] = useState([]);

  const toggleInterest = (item) => {
    setInterests(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const pillBase = "px-5 py-3 rounded-full text-[12px] font-black border-2 transition-all active:scale-95 uppercase tracking-widest";

  const isValid = !!gender && interests.length >= 1;

  const handleContinue = () => {
    if (!isValid) return;
    const existing = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");
    sessionStorage.setItem("bb_signup_data", JSON.stringify({ ...existing, gender, interests }));
    onNext();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-10 pb-8">
      <ProgressBar step={3} total={8} />
      <StepLabel step={3} total={8} />

      <h2 className="text-[34px] font-black text-gray-900 leading-tight mb-1">Votre Profil<br />Beauté</h2>
      <p className="text-[13px] text-gray-400 font-medium mb-6">Ces détails nous aident à personnaliser votre feed.</p>

      <div className="flex-1 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vous êtes ?</p>
            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">* Obligatoire</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {["FEMME", "HOMME", "AUTRE"].map(g => (
              <button key={g} onClick={() => setGender(g)} className={pillBase}
                style={{ borderColor: gender === g ? "#E8732A" : "#e5e7eb", background: gender === g ? "#E8732A" : "white", color: gender === g ? "white" : "#374151" }}>
                {g}
              </button>
            ))}
          </div>
          {!gender && <p className="text-[11px] text-orange-400 font-medium mt-2">Veuillez sélectionner une option</p>}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vos intérêts</p>
            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">* Au moins 1</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {INTERESTS.map(item => (
              <button key={item} onClick={() => toggleInterest(item)} className={pillBase}
                style={{ borderColor: interests.includes(item) ? "#E8732A" : "#e5e7eb", background: interests.includes(item) ? "#E8732A" : "white", color: interests.includes(item) ? "white" : "#374151" }}>
                {item}
              </button>
            ))}
          </div>
          {interests.length === 0 && <p className="text-[11px] text-orange-400 font-medium mt-2">Sélectionnez au moins un intérêt</p>}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all"
          style={{ background: isValid ? "#E8732A" : "#d1d5db" }}
        >
          Continuer
        </button>
        <button onClick={onBack} className="w-full text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">Retour</button>
      </div>
    </div>
  );
}

// ── STEP 3 — Photo de profil + Bannière ──────────────────────────────────────
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

  const canFinish = true;

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

      // Upsert direct dans la table profiles
      const { error } = await supabase.from('profiles').upsert(updates, { onConflict: 'id' });
      if (error) console.error('[StepPhoto] Profile upsert error:', error);

      // Aussi mettre à jour user_metadata
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
    <div className="min-h-screen bg-white flex flex-col px-6 pt-10 pb-8">
      <ProgressBar step={4} total={8} />
      <StepLabel step={4} total={8} />

      <h2 className="text-[34px] font-black text-gray-900 leading-tight mb-1">Personnalisez<br />votre profil</h2>
      <p className="text-[13px] text-gray-400 font-medium mb-6">Ajoutez une photo et une bannière pour vous identifier.</p>

      <div className="flex-1 space-y-6">
        {/* Bannière — optionnelle */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bannière de profil</p>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Optionnelle</span>
          </div>
          <div
            onClick={() => bannerRef.current?.click()}
            className="relative w-full h-32 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all border-2 border-dashed"
            style={{ borderColor: banner ? "#E8732A" : "#e5e7eb", background: "#f9fafb" }}
          >
            {banner ? (
              <img src={banner} alt="Bannière" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <Camera className="w-8 h-8 text-gray-300" strokeWidth={1} />
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Ajouter une bannière</span>
              </div>
            )}
            {banner && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-[11px] font-black uppercase">Changer</span>
              </div>
            )}
          </div>
          <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />

        </div>

        {/* Photo de profil — obligatoire */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Photo de profil</p>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Optionnelle</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                onClick={() => photoRef.current?.click()}
                className="w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed cursor-pointer"
                style={{ borderColor: photo ? "#E8732A" : "#e5e7eb", background: "#f9fafb" }}>
                {photo ? (
                  <img src={photo} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-300" strokeWidth={1} />
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
              <p className="text-[13px] font-black text-gray-800">Photo de profil</p>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Visible par la communauté</p>

            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-6">
        <button onClick={handleFinish} disabled={loading}
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all"
          style={{ background: !loading ? "#E8732A" : "#d1d5db" }}>
          {loading ? "Enregistrement..." : "Terminer mon profil"}
        </button>
        <button onClick={onBack} className="w-full text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">Retour</button>
      </div>
    </div>
  );
}

// ── STEP 4 — Success ──────────────────────────────────────────────────────────
function StepSuccess({ onDone }) {
  const data = JSON.parse(sessionStorage.getItem("bb_signup_data") || "{}");
  const prenom = data.prenom || "";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between px-6 py-16">
      <div className="absolute inset-0">
        <img src="https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/db68ade46_generated_image.png" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,10,5,0.35) 0%, rgba(10,5,0,0.65) 55%, rgba(5,0,0,0.92) 100%)" }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
        {/* Logo B avec cercle rose pâle */}
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-2xl overflow-hidden"
          style={{ background: "white", border: "3px solid #f2c4a8" }}>
          <img src={LOGO_IMG} alt="BeautyBook" className="w-16 h-16 object-contain" />
        </div>
        <h2 className="text-[48px] font-black text-white leading-tight mb-2">
          Merveilleux{prenom ? `,\n${prenom}` : ""}<br />!
        </h2>
        <p className="text-[15px] text-white/70 font-medium leading-relaxed max-w-[260px]">
          Votre profil est prêt. Bienvenue dans la communauté BeautyBook.
        </p>
      </div>

      <div className="relative z-10 w-full">
        <button onClick={onDone}
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg"
          style={{ background: "#E8732A", boxShadow: "0 0 40px rgba(232,115,42,0.5)" }}>
          Découvrir BeautyBook
        </button>
      </div>
    </div>
  );
}

// ── STEP 5 — Autorisation Notifications ──────────────────────────────────────
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
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5ED] to-white flex flex-col px-6 pt-10 pb-8">
      <ProgressBar step={5} total={8} />
      <StepLabel step={5} total={8} />
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
        <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center shadow-lg shadow-orange-100">
          <span className="text-[56px]">🔔</span>
        </div>
        <div>
          <h2 className="text-[36px] font-black text-gray-900 leading-tight mb-3">Notifications</h2>
          <p className="text-[15px] text-gray-400 font-medium leading-relaxed max-w-[320px] mx-auto">
            Recevez des alertes pour vos réservations, messages et offres exclusives.
          </p>
        </div>
        {status === 'granted' && (
          <div className="flex items-center gap-2 bg-green-50 px-5 py-3 rounded-full">
            <span className="text-green-500 text-[20px]">✓</span>
            <span className="text-green-600 text-[13px] font-bold">Notifications activées</span>
          </div>
        )}
        {status === 'denied' && (
          <div className="flex items-center gap-2 bg-red-50 px-5 py-3 rounded-full">
            <span className="text-red-500 text-[20px]">✕</span>
            <span className="text-red-500 text-[13px] font-bold">Autorisation refusée</span>
          </div>
        )}
      </div>
      <div className="space-y-3 mt-6">
        {status === 'idle' || status === 'loading' ? (
          <button onClick={handleAllow} disabled={status === 'loading'}
            className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg shadow-orange-200"
            style={{ background: "#E8732A" }}>
            {status === 'loading' ? "En attente..." : "Activer les notifications"}
          </button>
        ) : null}
        <button onClick={onNext} className="w-full py-3 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest active:scale-95 transition-all">
          Passer
        </button>
      </div>
    </div>
  );
}

// ── STEP 6 — Autorisation Localisation ───────────────────────────────────────
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
      // Sauvegarder la position si autorisée
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
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5ED] to-white flex flex-col px-6 pt-10 pb-8">
      <ProgressBar step={6} total={8} />
      <StepLabel step={6} total={8} />
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
        <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center shadow-lg shadow-orange-100">
          <span className="text-[56px]">📍</span>
        </div>
        <div>
          <h2 className="text-[36px] font-black text-gray-900 leading-tight mb-3">Localisation</h2>
          <p className="text-[15px] text-gray-400 font-medium leading-relaxed max-w-[320px] mx-auto">
            Trouvez les salons et professionnels beauté les plus proches de chez vous.
          </p>
        </div>
        {status === 'granted' && (
          <div className="flex items-center gap-2 bg-green-50 px-5 py-3 rounded-full">
            <span className="text-green-500 text-[20px]">✓</span>
            <span className="text-green-600 text-[13px] font-bold">Localisation activée</span>
          </div>
        )}
        {status === 'denied' && (
          <div className="flex items-center gap-2 bg-red-50 px-5 py-3 rounded-full">
            <span className="text-red-500 text-[20px]">✕</span>
            <span className="text-red-500 text-[13px] font-bold">Autorisation refusée</span>
          </div>
        )}
      </div>
      <div className="space-y-3 mt-6">
        {status === 'idle' || status === 'loading' ? (
          <button onClick={handleAllow} disabled={status === 'loading'}
            className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg shadow-orange-200"
            style={{ background: "#E8732A" }}>
            {status === 'loading' ? "En attente..." : "Activer la localisation"}
          </button>
        ) : null}
        <button onClick={onNext} className="w-full py-3 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest active:scale-95 transition-all">
          Passer
        </button>
      </div>
    </div>
  );
}

// ── STEP 7 — Autorisation Caméra & Micro ─────────────────────────────────────
function StepCameraMic({ onNext }) {
  const [camStatus, setCamStatus] = useState('idle');
  const [micStatus, setMicStatus] = useState('idle');

  const handleAllow = async () => {
    setCamStatus('loading');
    setMicStatus('loading');

    // Caméra
    try {
      const stream = await navigator.mediaDevices?.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCamStatus('granted');
      // Sauvegarder dans le profil
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').upsert({ id: user.id, camera_enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    } catch (_) { setCamStatus('denied'); }

    // Micro
    try {
      const stream = await navigator.mediaDevices?.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicStatus('granted');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').upsert({ id: user.id, mic_enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    } catch (_) { setMicStatus('denied'); }

    setTimeout(onNext, 1200);
  };

  const bothGranted = camStatus === 'granted' && micStatus === 'granted';
  const anyDenied = camStatus === 'denied' || micStatus === 'denied';
  const isIdle = camStatus === 'idle';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5ED] to-white flex flex-col px-6 pt-10 pb-8">
      <ProgressBar step={7} total={8} />
      <StepLabel step={7} total={8} />
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
        <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center shadow-lg shadow-orange-100">
          <span className="text-[56px]">📸</span>
        </div>
        <div>
          <h2 className="text-[36px] font-black text-gray-900 leading-tight mb-3">Caméra & Micro</h2>
          <p className="text-[15px] text-gray-400 font-medium leading-relaxed max-w-[320px] mx-auto">
            Prenez des photos, enregistrez des reels et utilisez l'assistant vocal.
          </p>
        </div>
        <div className="flex gap-3">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all ${camStatus === 'granted' ? 'bg-green-50 text-green-600 border border-green-200' : camStatus === 'denied' ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
            📷 {camStatus === 'granted' ? 'Activé' : camStatus === 'denied' ? 'Refusé' : 'Caméra'}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all ${micStatus === 'granted' ? 'bg-green-50 text-green-600 border border-green-200' : micStatus === 'denied' ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
            🎙️ {micStatus === 'granted' ? 'Activé' : micStatus === 'denied' ? 'Refusé' : 'Micro'}
          </div>
        </div>
      </div>
      <div className="space-y-3 mt-6">
        {isIdle ? (
          <button onClick={handleAllow}
            className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg shadow-orange-200"
            style={{ background: "#E8732A" }}>
            Autoriser l'accès
          </button>
        ) : null}
        <button onClick={onNext} className="w-full py-3 text-center text-[12px] font-black text-gray-400 uppercase tracking-widest active:scale-95 transition-all">
          Passer
        </button>
      </div>
    </div>
  );
}

// ── Main Onboarding ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  // Si retour après login social, démarrer à l'étape 2
  const [step, setStep] = useState(() => {
    if (sessionStorage.getItem("bb_social_signup") === "1") {
      sessionStorage.removeItem("bb_social_signup");
      sessionStorage.setItem("bb_social_signup_processed", "1");
      return 2;
    }
    // Si on vient de "Créer un compte" depuis la page connexion, démarrer à l'étape 1
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
    setStep(2); // → StepVerification (email OU téléphone)
  };

  return (
    <div className="font-display relative">
      {step === 0 && <StepSplash onNext={() => setStep(1)} onDiscover={done} />}
      {step === 1 && <StepSignup onNext={handleSignupNext} onBack={() => setStep(0)} />}
      {step === 2 && <StepVerification onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <StepBeautyProfile onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <StepPhoto onNext={() => setStep(5)} onBack={() => setStep(3)} />}
      {step === 5 && <StepNotifications onNext={() => setStep(6)} onBack={() => setStep(4)} />}
      {step === 6 && <StepLocation onNext={() => setStep(7)} onBack={() => setStep(5)} />}
      {step === 7 && <StepCameraMic onNext={() => setStep(8)} onBack={() => setStep(6)} />}
      {step === 8 && <StepSuccess onDone={done} />}
    </div>
  );
}