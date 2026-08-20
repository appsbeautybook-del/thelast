import { useState, useEffect } from "react";
import { Shield, Cookie, Settings, Check } from "lucide-react";

const STORAGE_KEY = "bb_cookie_consent";

function Toggle({ value, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange?.(!value)}
      className={`w-11 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 shrink-0 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ background: value ? "#E8732A" : "#d1d5db" }}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${value ? "translate-x-5" : "translate-x-0"}`} />
    </div>
  );
}

const CATEGORIES = [
  {
    key: "analytics",
    icon: Settings,
    label: "Analytiques",
    desc: "Nous aident à améliorer l'application (pages visitées, erreurs)",
    color: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    key: "marketing",
    icon: Cookie,
    label: "Marketing",
    desc: "Notifications push personnalisées et recommandations",
    color: "bg-purple-50",
    iconColor: "text-purple-500",
  },
];

function saveToStorage(values) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    necessary: true,
    analytics: values.analytics,
    marketing: values.marketing,
    timestamp: new Date().toISOString(),
  }));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const handleAcceptAll = () => {
    setAnalytics(true);
    setMarketing(true);
    saveToStorage({ analytics: true, marketing: true });
    setVisible(false);
  };

  const handleRejectAll = () => {
    setAnalytics(false);
    setMarketing(false);
    saveToStorage({ analytics: false, marketing: false });
    setVisible(false);
  };

  const handleSave = () => {
    saveToStorage({ analytics, marketing });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998]" />

      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[999] flex justify-center px-4 pb-4">
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-gray-900">Paramètres de confidentialité</h3>
                <p className="text-[11px] text-gray-400 font-medium">Gérez vos préférences de cookies</p>
              </div>
            </div>
            <p className="text-[12px] text-gray-500 font-medium leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez personnaliser vos choix ci-dessous.
            </p>
          </div>

          {/* Necessary (always on) */}
          <div className="px-6 pb-3">
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-black text-gray-900">Nécessaires</p>
                <p className="text-[11px] text-gray-400 font-medium">Authentification, sécurité, fonctionnement</p>
              </div>
              <Toggle value={true} disabled />
            </div>
          </div>

          {/* Optional categories */}
          <div className="px-6 pb-4 space-y-2">
            {CATEGORIES.map(({ key, icon: Icon, label, desc, color, iconColor }) => (
              <div key={key} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black text-gray-900">{label}</p>
                  <p className="text-[11px] text-gray-400 font-medium">{desc}</p>
                </div>
                <Toggle
                  value={key === "analytics" ? analytics : marketing}
                  onChange={key === "analytics" ? setAnalytics : setMarketing}
                />
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="px-6 pb-6 space-y-2">
            <button
              onClick={handleAcceptAll}
              className="w-full bg-primary text-white font-black text-[13px] py-3.5 rounded-2xl active:scale-[0.98] transition-all"
            >
              Tout accepter
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleRejectAll}
                className="flex-1 bg-gray-100 text-gray-600 font-black text-[12px] py-3 rounded-2xl active:scale-[0.98] transition-all"
              >
                Tout refuser
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-primary/10 text-primary font-black text-[12px] py-3 rounded-2xl active:scale-[0.98] transition-all"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
