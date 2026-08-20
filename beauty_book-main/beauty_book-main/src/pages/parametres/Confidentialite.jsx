import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Users, MapPin, BarChart2, Trash2, Download, CheckCircle2 } from "lucide-react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useThemeBg } from "@/hooks/useTheme";

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className="w-11 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 cursor-pointer shrink-0"
      style={{ background: value ? "#E8732A" : "#d1d5db" }}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${value ? "translate-x-5" : "translate-x-0"}`} />
    </div>
  );
}

const DEFAULTS = { profil_public: true, show_location: false, analytics: true, show_activity: true };

export default function Confidentialite() {
  const navigate = useNavigate();
  const themeBg = useThemeBg();
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem("bb_privacy");
    return saved ? JSON.parse(saved) : DEFAULTS;
  });
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const set = (key, val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    localStorage.setItem("bb_privacy", JSON.stringify(updated));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const user = await supabase.auth.getUser().then(({ data }) => data?.user).catch(() => null);
      const reservations = await entities.Reservation.list("-created_at", 100).catch(() => []);
      const commandes = await entities.Commande.list("-created_at", 100).catch(() => []);
      const exportData = {
        export_date: new Date().toISOString(),
        user: user ? { email: user.email, full_name: user.full_name } : {},
        preferences: prefs,
        reservations,
        commandes,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beautybook-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (e) {
      alert("Erreur lors de l'export : " + e.message);
    }
    setExporting(false);
  };

  return (
    <div className="font-display min-h-screen" style={{ background: themeBg }}>
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-primary" />
        </button>
        <h1 className="text-[20px] font-black text-gray-900">Confidentialité</h1>
      </div>

      <div className="px-4 pb-20 pt-5 space-y-5">

        {/* Hero image */}
        <div className="relative rounded-3xl overflow-hidden h-36">
          <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-5">
            <div>
              <p className="text-white text-[20px] font-black leading-tight">Vos données,<br />votre contrôle.</p>
              <p className="text-white/70 text-[11px] font-medium mt-1">Gérez qui voit quoi.</p>
            </div>
          </div>
        </div>

        {/* Visibilité */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Visibilité du profil</p>
          <div className="bg-white rounded-3xl overflow-hidden divide-y divide-gray-50">
            {[
              { key: "profil_public", icon: Eye, label: "Profil public", sub: "Visible par tous les utilisateurs", color: "bg-blue-50", iconColor: "text-blue-500" },
              { key: "show_location", icon: MapPin, label: "Afficher ma localisation", sub: "Position approximative visible", color: "bg-green-50", iconColor: "text-green-500" },
              { key: "show_activity", icon: Users, label: "Activité récente visible", sub: "Dernière connexion et réservations", color: "bg-purple-50", iconColor: "text-purple-500" },
              { key: "analytics", icon: BarChart2, label: "Amélioration du service", sub: "Données anonymes pour améliorer l'app", color: "bg-orange-50", iconColor: "text-primary" },
            ].map(({ key, icon: Icon, label, sub, color, iconColor }) => (
              <div key={key} className="px-4 py-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-black text-gray-900">{label}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{sub}</p>
                </div>
                <Toggle value={prefs[key]} onChange={v => set(key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* Données */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Mes données</p>
          <div className="space-y-2">
            <button onClick={() => navigate("/parametres/mes-donnees")} className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.99] transition-all">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-black text-gray-900">Exporter mes données</p>
                <p className="text-[11px] text-gray-400 font-medium">Télécharger toutes vos données (RGPD)</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 shrink-0" />
            </button>
            <button onClick={() => navigate("/parametres/politique-confidentialite")} className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.99] transition-all">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-black text-gray-900">Politique de confidentialité</p>
                <p className="text-[11px] text-gray-400 font-medium">Détails du traitement de vos données</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 shrink-0" />
            </button>
            <button onClick={() => navigate("/supprimer-compte")} className="w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.99] transition-all">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-black text-red-500">Supprimer mon compte</p>
                <p className="text-[11px] text-red-300 font-medium">Action irréversible</p>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}