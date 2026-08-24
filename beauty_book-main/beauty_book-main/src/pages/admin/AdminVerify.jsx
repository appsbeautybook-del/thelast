import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from '@/api/supabaseClient';

export default function AdminVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || sessionStorage.getItem("bb_admin_verify_email") || "";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(45);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (email) sessionStorage.setItem("bb_admin_verify_email", email);
  }, [email]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendTimer(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Auto-read clipboard for OTP
  useEffect(() => {
    const read = async () => {
      try {
        if (navigator.clipboard?.readText) {
          const t = await navigator.clipboard.readText();
          const d = t.replace(/\D/g, "").slice(0, 6);
          if (d.length === 6) setCode(d.split(""));
        }
      } catch {}
    };
    setTimeout(read, 600);
  }, []);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const n = [...code];
    n[i] = val;
    setCode(n);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const fullCode = code.join("");

  const handleVerify = async () => {
    if (fullCode.length < 6 || loading) return;
    setLoading(true);
    setError("");

    if (!email) {
      setError("Email introuvable. Retournez à l'inscription.");
      setLoading(false);
      return;
    }

    const { error: e } = await supabase.auth.verifyOtp({ email, token: fullCode, type: 'signup' });
    if (e) {
      setError("Code incorrect ou expiré. Vérifiez votre boîte mail.");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      setLoading(false);
      return;
    }

    // Create admin profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "Admin",
        role: 'admin',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => navigate("/admin/dashboard"), 1500);
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending || !email) return;
    setResending(true);
    setError("");
    try {
      await supabase.auth.signInWithOtp({ email, options: { data: { role: 'admin' } } });
    } catch {}
    setResending(false);
    setResendTimer(45);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; });
    }, 1000);
  };

  const masked = email?.replace(/(.{2}).+(@.+)/, "$1***$2") || "";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white text-[26px] font-black">BeautyBook</h1>
          <p className="text-gray-400 text-[13px] font-medium mt-1">Vérification du compte Admin</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-green-400 text-[15px] font-bold">Compte vérifié avec succès !</p>
            <p className="text-gray-500 text-[13px]">Redirection vers le panneau admin...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-[13px] text-center mb-8">
              Entrez le code à 6 chiffres envoyé à<br />
              <span className="text-white font-bold">{masked}</span>
            </p>

            {/* OTP Input */}
            <div className="flex justify-center gap-2 mb-6">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-14 bg-gray-800 border-2 border-gray-700 rounded-xl text-center text-white text-[22px] font-black outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-500/40 rounded-xl px-4 py-3 mb-4">
                <p className="text-red-400 text-[12px] font-medium text-center">{error}</p>
              </div>
            )}

            {/* Verify button */}
            <button
              onClick={handleVerify}
              disabled={fullCode.length < 6 || loading}
              className="w-full bg-primary text-white font-black py-4 rounded-2xl text-[15px] uppercase tracking-widest shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Vérifier →"}
            </button>

            {/* Resend */}
            <div className="text-center mt-6">
              {resendTimer > 0 ? (
                <p className="text-gray-500 text-[12px]">Renvoyer dans {resendTimer}s</p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-primary text-[13px] font-bold hover:underline"
                >
                  {resending ? "Envoi..." : "Renvoyer le code"}
                </button>
              )}
            </div>

            {/* Back to login */}
            <button
              onClick={() => navigate("/admin")}
              className="w-full mt-6 flex items-center justify-center gap-2 text-gray-500 text-[13px] font-medium hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </button>
          </>
        )}
      </div>
    </div>
  );
}
