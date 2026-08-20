import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileJson, FileText, CheckCircle2, Loader2, Database, User, Calendar, ShoppingBag, MessageSquare, Star, Camera, Shield, Trash2 } from "lucide-react";
import { supabase } from '@/api/supabaseClient';
import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { useThemeBg } from "@/hooks/useTheme";

const DATA_CATEGORIES = [
  { key: "profil", label: "Profil", sub: "Nom, email, photo", icon: User, color: "bg-blue-50", iconColor: "text-blue-500" },
  { key: "reservations", label: "Réservations", sub: "Historique de rendez-vous", icon: Calendar, color: "bg-purple-50", iconColor: "text-purple-500" },
  { key: "commandes", label: "Commandes", sub: "Achats et paiements", icon: ShoppingBag, color: "bg-orange-50", iconColor: "text-primary" },
  { key: "avis", label: "Avis / Commentaires", sub: "Notes et retours donnés", icon: Star, color: "bg-yellow-50", iconColor: "text-yellow-500" },
  { key: "messages", label: "Messages", sub: "Conversations privées", icon: MessageSquare, color: "bg-green-50", iconColor: "text-green-500" },
  { key: "routines", label: "Routines beauté", sub: "Routines personnalisées", icon: Camera, color: "bg-pink-50", iconColor: "text-pink-500" },
];

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MesDonnees() {
  const navigate = useNavigate();
  const themeBg = useThemeBg();
  const { user } = useAuth();

  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [exportingKey, setExportingKey] = useState(null);
  const [exportedKeys, setExportedKeys] = useState({});
  const [exportingAll, setExportingAll] = useState(false);
  const [exportAllDone, setExportAllDone] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const fetchCounts = async () => {
      const email = user.email;
      try {
        const [prof, res, cmd, avi, msg, rut] = await Promise.all([
          entities.profiles.filter({ email }),
          entities.Reservation.filter({ client_email: email }, "-created_at", 1000),
          entities.Commande.filter({ client_email: email }, "-created_at", 1000),
          entities.Avis.filter({ user_email: email }, "-created_at", 1000),
          entities.MessageChat.filter({ sender_email: email }, "-created_at", 1000),
          entities.RoutineBeaute.filter({ user_email: email }, "-created_at", 1000),
        ]);
        setCounts({
          profil: prof.length,
          reservations: res.length,
          commandes: cmd.length,
          avis: avi.length,
          messages: msg.length,
          routines: rut.length,
        });
      } catch (e) {
        console.error("[MesDonnees] fetchCounts error:", e);
      }
      setLoading(false);
    };
    fetchCounts();
  }, [user?.email]);

  const fetchDataForCategory = async (key) => {
    const email = user.email;
    switch (key) {
      case "profil":
        return await entities.profiles.filter({ email });
      case "reservations":
        return await entities.Reservation.filter({ client_email: email }, "-created_at", 1000);
      case "commandes":
        return await entities.Commande.filter({ client_email: email }, "-created_at", 1000);
      case "avis":
        return await entities.Avis.filter({ user_email: email }, "-created_at", 1000);
      case "messages":
        return await entities.MessageChat.filter({ sender_email: email }, "-created_at", 1000);
      case "routines":
        return await entities.RoutineBeaute.filter({ user_email: email }, "-created_at", 1000);
      default:
        return [];
    }
  };

  const handleExportCategory = async (key) => {
    setExportingKey(key);
    try {
      const data = await fetchDataForCategory(key);
      const exportData = {
        export_date: new Date().toISOString(),
        user_email: user.email,
        category: key,
        count: data.length,
        data,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const date = new Date().toISOString().split("T")[0];
      triggerDownload(blob, `beautybook-${key}-${date}.json`);
      setExportedKeys((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setExportedKeys((prev) => ({ ...prev, [key]: false })), 3000);
    } catch (e) {
      console.error(`[MesDonnees] export ${key} error:`, e);
    }
    setExportingKey(null);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const email = user.email;
      const [profil, reservations, commandes, avis, messages, routines] = await Promise.all([
        entities.profiles.filter({ email }),
        entities.Reservation.filter({ client_email: email }, "-created_at", 1000),
        entities.Commande.filter({ client_email: email }, "-created_at", 1000),
        entities.Avis.filter({ user_email: email }, "-created_at", 1000),
        entities.MessageChat.filter({ sender_email: email }, "-created_at", 1000),
        entities.RoutineBeaute.filter({ user_email: email }, "-created_at", 1000),
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        platform: "BeautyBook",
        user_email: email,
        summary: {
          profil: profil.length,
          reservations: reservations.length,
          commandes: commandes.length,
          avis: avis.length,
          messages: messages.length,
          routines: routines.length,
        },
        data: { profil, reservations, commandes, avis, messages, routines },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const date = new Date().toISOString().split("T")[0];
      triggerDownload(blob, `beautybook-mes-donnes-${date}.json`);
      setExportAllDone(true);
      setTimeout(() => setExportAllDone(false), 4000);
    } catch (e) {
      console.error("[MesDonnees] exportAll error:", e);
    }
    setExportingAll(false);
  };

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="font-display min-h-screen" style={{ background: themeBg }}>
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-primary" />
        </button>
        <h1 className="text-[20px] font-black text-gray-900">Mes Données</h1>
      </div>

      <div className="px-4 pb-20 pt-5 space-y-5">

        {/* Hero RGPD */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 px-5 py-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-black text-white leading-tight">Vos données, votre droit</p>
              <p className="text-[12px] text-white/70 font-medium mt-1.5 leading-relaxed">
                Conformément au RGPD, vous pouvez exporter l'intégralité de vos données personnelles.
              </p>
            </div>
          </div>
        </div>

        {/* Résumé */}
        {!loading && (
          <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3">
            <Database className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-black text-gray-900">{totalRecords} enregistrement{totalRecords !== 1 ? "s" : ""} trouvé{totalRecords !== 1 ? "s" : ""}</p>
              <p className="text-[11px] text-gray-400 font-medium">6 catégories de données personnelles</p>
            </div>
          </div>
        )}

        {/* Catégories de données */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Exporter par catégorie</p>
          <div className="space-y-2">
            {DATA_CATEGORIES.map(({ key, label, sub, icon: Icon, color, iconColor }) => {
              const isExporting = exportingKey === key;
              const isExported = exportedKeys[key];
              const count = counts[key];

              return (
                <div key={key} className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3">
                  <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-black text-gray-900">{label}</p>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {loading ? "Chargement..." : `${count || 0} ${sub.toLowerCase()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportCategory(key)}
                    disabled={isExporting || loading || !count}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                    style={{
                      background: isExported ? "#dcfce7" : isExporting ? "#f3f4f6" : "#f9fafb",
                      color: isExported ? "#16a34a" : isExporting ? "#9ca3af" : "#6b7280",
                      border: "1px solid",
                      borderColor: isExported ? "#bbf7d0" : isExporting ? "#e5e7eb" : "#f3f4f6",
                    }}
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isExported ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{isExported ? "Fait" : isExporting ? "..." : "Exporter"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Export complet */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Export complet</p>
          <button
            onClick={handleExportAll}
            disabled={exportingAll || loading}
            className="w-full rounded-2xl px-5 py-5 flex items-center gap-4 active:scale-[0.99] transition-all"
            style={{
              background: exportAllDone ? "#f0fdf4" : "white",
              border: "2px solid",
              borderColor: exportAllDone ? "#86efac" : "#E8732A",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: exportAllDone ? "#dcfce7" : "#fff7ed",
              }}
            >
              {exportingAll ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : exportAllDone ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <FileJson className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-black text-gray-900">
                {exportAllDone ? "Export téléchargé !" : "Télécharger toutes mes données"}
              </p>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                {exportAllDone
                  ? "Fichier JSON complet prêt"
                  : exportingAll
                    ? "Préparation de l'export..."
                    : `Un fichier JSON contenant ${totalRecords} enregistrements`}
              </p>
            </div>
            {!exportingAll && !exportAllDone && (
              <Download className="w-5 h-5 text-primary shrink-0" />
            )}
          </button>
        </div>

        {/* Infos légales */}
        <div className="bg-gray-50 rounded-2xl px-4 py-4 space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
              Les données exportées sont au format JSON. Vous pouvez les conserver ou les transférer à un autre service conformément au RGPD.
            </p>
          </div>
        </div>

        {/* Supprimer compte */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Gestion du compte</p>
          <button
            onClick={() => navigate("/supprimer-compte")}
            className="w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.99] transition-all"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-black text-red-500">Supprimer mon compte</p>
              <p className="text-[11px] text-red-300 font-medium">Action irréversible</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-red-300 rotate-180 shrink-0" />
          </button>
        </div>

      </div>
    </div>
  );
}
