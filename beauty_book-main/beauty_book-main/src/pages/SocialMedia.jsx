import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import {
  ArrowLeft, CheckCircle2, Shield, Eye, EyeOff, ChevronRight,
  ExternalLink, Settings, Power, PowerOff, BarChart3, MessageCircle,
  Bot, Users, TrendingUp, Clock
} from "lucide-react";

const PLATFORMS = [
  {
    id: "instagram", name: "Instagram",
    icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    color: "#E4405F", gradient: "from-pink-500 to-rose-500",
    desc: "DMs, commentaires et stories avec IA",
    fields: [
      { key: "accessToken", label: "Token d'accès", placeholder: "EAA...", type: "password", link: "https://developers.facebook.com/tools/explorer/", required: true },
      { key: "businessId", label: "Business Account ID", placeholder: "17841400...", type: "text", link: "https://business.facebook.com/settings/", required: true },
    ],
    features: ["Réponses auto DM", "Réponses commentaires", "Story replies", "Gestion mentions"]
  },
  {
    id: "facebook", name: "Facebook",
    icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    color: "#1877F2", gradient: "from-blue-600 to-blue-500",
    desc: "Messenger et commentaires automatisés",
    fields: [
      { key: "pageAccessToken", label: "Page Access Token", placeholder: "EAA...", type: "password", link: "https://developers.facebook.com/tools/explorer/", required: true },
      { key: "pageId", label: "Page ID", placeholder: "123456789...", type: "text", link: "https://www.facebook.com/settings/pages/", required: true },
    ],
    features: ["Messenger auto-reply", "Comment auto-reply", "Broadcast", "Lead generation"]
  },
  {
    id: "whatsapp", name: "WhatsApp Business",
    icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
    color: "#25D366", gradient: "from-emerald-500 to-green-500",
    desc: "Convertissez les prospects via WhatsApp",
    fields: [
      { key: "phoneNumberId", label: "Phone Number ID", placeholder: "123456789...", type: "text", link: "https://developers.facebook.com/apps/", required: true },
      { key: "accessToken", label: "Token permanent", placeholder: "EAA...", type: "password", link: "https://business.facebook.com/wa/manage/", required: true },
    ],
    features: ["Messages texte/image", "Templates WhatsApp", "Catalogue produits", "Paiements"]
  },
  {
    id: "tiktok", name: "TikTok",
    icon: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z",
    color: "#000000", gradient: "from-gray-900 to-gray-700",
    desc: "Commentaires et DMs TikTok automatisés",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "TikTok access token...", type: "password", link: "https://developers.tiktok.com/", required: true },
      { key: "openId", label: "Open ID", placeholder: "open_id...", type: "text", link: "https://business.tiktok.com/", required: true },
    ],
    features: ["Réponses commentaires", "DM automation", "Analytics"]
  },
];

function SocialIcon({ path, color, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={path} />
    </svg>
  );
}

export default function SocialMedia() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "night";

  const [activeTab, setActiveTab] = useState("platforms");
  const [expandedId, setExpandedId] = useState("instagram");
  const [validating, setValidating] = useState(null);
  const [platforms, setPlatforms] = useState(
    PLATFORMS.map(p => ({ ...p, connected: false, keys: {}, showKeys: {}, validKeys: {} }))
  );

  const areKeysValid = (p) => {
    return p.fields.filter(f => f.required).every(f => p.keys[f.key]?.trim());
  };

  const toggleConnect = async (id) => {
    const platform = platforms.find(p => p.id === id);
    if (platform.connected) {
      setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: false, validKeys: {} } : p));
      return;
    }
    if (!areKeysValid(platform)) return;

    setValidating(id);
    await new Promise(r => setTimeout(r, 800));
    setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: true, validKeys: { ...p.keys } } : p));
    setValidating(null);
  };

  const setKey = (id, key, value) => {
    setPlatforms(prev => prev.map(p => p.id === id ? { ...p, keys: { ...p.keys, [key]: value }, connected: false } : p));
  };

  const toggleShowKey = (id, key) => {
    setPlatforms(prev => prev.map(p => p.id === id ? { ...p, showKeys: { ...p.showKeys, [key]: !p.showKeys[key] } } : p));
  };

  const connectedCount = platforms.filter(p => p.connected).length;

  const c = {
    page: isDark ? "bg-[#0a0a1a]" : "bg-gray-50",
    header: isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-primary to-orange-600",
    card: isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-gray-100",
    cardActive: isDark ? "bg-primary/10 border-primary/20" : "bg-orange-50 border-primary/20",
    text: isDark ? "text-white" : "text-gray-900",
    textSub: isDark ? "text-gray-400" : "text-gray-500",
    input: isDark ? "bg-white/5 border-white/10 text-white placeholder:text-gray-600" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400",
    inputError: "border-red-300 dark:border-red-500/30",
    tag: isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500",
    divider: isDark ? "border-white/[0.06]" : "border-gray-100",
    statCard: isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-gray-100",
  };

  return (
    <div className={`font-display min-h-screen ${c.page}`}>
      {/* Header */}
      <div className={`${c.header} px-5 pt-12 pb-6`}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-[22px] font-black text-white">Réseaux Sociaux</h1>
            <p className="text-[12px] text-white/60 mt-0.5">Maria AI · Connectez vos plateformes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "platforms", label: "Plateformes" },
            { id: "stats", label: "Statistiques" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 rounded-2xl text-[14px] font-black transition-all ${activeTab === tab.id ? "bg-white text-gray-900" : "bg-white/10 text-white/70"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-32 space-y-3 pt-4">
        {activeTab === "platforms" && (
          <>
            {/* Status */}
            <div className={`flex items-center justify-between ${c.card} border rounded-2xl px-4 py-3`}>
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${connectedCount > 0 ? "bg-green-400 animate-pulse" : isDark ? "bg-gray-600" : "bg-gray-300"}`} />
                <span className={`text-[13px] font-medium ${c.textSub}`}>
                  {connectedCount > 0 ? `${connectedCount} plateforme${connectedCount > 1 ? "s" : ""} active${connectedCount > 1 ? "s" : ""}` : "Aucune plateforme connectée"}
                </span>
              </div>
              {connectedCount > 0 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </div>

            {/* Platform cards */}
            {platforms.map(p => {
              const isExpanded = expandedId === p.id;
              const keysValid = areKeysValid(p);
              return (
                <div key={p.id} className={`rounded-3xl overflow-hidden transition-all border ${p.connected ? c.cardActive : c.card}`}>
                  {/* Header */}
                  <div className="p-4 flex items-center gap-3.5">
                    <div className={`w-12 h-12 bg-gradient-to-br ${p.gradient} rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
                      <SocialIcon path={p.icon} color="white" size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[15px] font-black ${c.text}`}>{p.name}</p>
                        {p.connected && (
                          <div className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full">
                            <Power className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] font-bold text-green-500">ACTIF</span>
                          </div>
                        )}
                      </div>
                      <p className={`text-[12px] ${c.textSub} mt-0.5`}>{p.desc}</p>
                    </div>
                  </div>

                  {/* Features */}
                  {!isExpanded && (
                    <div className="px-4 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {p.features.map((f, i) => (
                          <span key={i} className={`text-[10px] font-medium ${c.tag} px-2.5 py-1 rounded-full`}>{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded config */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className={`${c.card} border rounded-2xl p-3.5 space-y-3`}>
                        <p className={`text-[11px] font-bold ${c.textSub} uppercase tracking-wider`}>Clés API</p>
                        {p.fields.map(field => {
                          const hasValue = p.keys[field.key]?.trim();
                          const showError = field.required && !hasValue && p.connected === false;
                          return (
                            <div key={field.key}>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className={`text-[12px] font-medium ${c.textSub}`}>{field.label}</p>
                                {field.link && (
                                  <a href={field.link} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[11px] text-primary font-medium">
                                    Obtenir <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div className={`flex items-center ${c.input} border rounded-xl overflow-hidden ${hasValue ? "border-green-300 dark:border-green-500/30" : ""}`}>
                                <input
                                  type={p.showKeys[field.key] ? "text" : field.type}
                                  value={p.keys[field.key] || ""}
                                  onChange={e => setKey(p.id, field.key, e.target.value)}
                                  placeholder={field.placeholder}
                                  className={`flex-1 bg-transparent text-[13px] px-4 py-3 outline-none font-mono ${c.text}`}
                                />
                                <div className="flex items-center gap-1 pr-3">
                                  {hasValue && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                  <button onClick={() => toggleShowKey(p.id, field.key)} className="opacity-40">
                                    {p.showKeys[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2.5 bg-green-500/5 border border-green-500/10 rounded-2xl p-3.5">
                        <Shield className="w-4 h-4 text-green-500 shrink-0" />
                        <p className={`text-[11px] ${c.textSub}`}>Clés chiffrées et stockées de manière sécurisée.</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => toggleConnect(p.id)}
                      disabled={validating === p.id || (!p.connected && !keysValid)}
                      className={`flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                        p.connected
                          ? "bg-red-50 text-red-500 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20"
                          : keysValid
                            ? isDark ? "bg-white text-gray-900" : "bg-primary text-white"
                            : isDark ? "bg-white/5 text-gray-500 border border-white/10" : "bg-gray-100 text-gray-400 border border-gray-200"
                      }`}>
                      {validating === p.id ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Validation…
                        </span>
                      ) : p.connected ? (
                        <><PowerOff className="w-4 h-4" /> Déconnecter</>
                      ) : (
                        <><Power className="w-4 h-4" /> Connecter</>
                      )}
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className={`w-12 rounded-2xl flex items-center justify-center transition-all active:scale-[0.98] border ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
                      <ChevronRight className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"} transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {activeTab === "stats" && (
          <>
            <div className={`${isDark ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/20" : "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"} border rounded-3xl p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${isDark ? "bg-purple-500/20" : "bg-purple-100"} rounded-xl flex items-center justify-center`}>
                  <BarChart3 className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                </div>
                <div>
                  <p className={`text-[16px] font-black ${c.text}`}>Performance globale</p>
                  <p className={`text-[12px] ${c.textSub}`}>Derniers 30 jours</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Messages", value: "—", icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Réponses auto", value: "—", icon: Bot, color: "text-purple-500", bg: "bg-purple-500/10" },
                  { label: "Prospects", value: "—", icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" },
                  { label: "Conversions", value: "—", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className={`${c.statCard} border rounded-2xl p-4`}>
                      <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
                        <Icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <p className={`text-[20px] font-black ${c.text}`}>{s.value}</p>
                      <p className={`text-[11px] ${c.textSub}`}>{s.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {connectedCount === 0 && (
              <div className={`${c.card} border rounded-3xl p-8 text-center`}>
                <div className={`w-14 h-14 ${isDark ? "bg-white/5" : "bg-gray-100"} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <BarChart3 className={`w-7 h-7 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                </div>
                <p className={`text-[15px] font-black ${c.text} mb-1`}>Aucune donnée</p>
                <p className={`text-[13px] ${c.textSub}`}>Connectez une plateforme pour voir les statistiques.</p>
              </div>
            )}

            {connectedCount > 0 && (
              <div className={`${c.statCard} border rounded-3xl p-5`}>
                <p className={`text-[12px] font-bold ${c.textSub} uppercase tracking-wider mb-3`}>Plateformes actives</p>
                <div className="space-y-3">
                  {platforms.filter(p => p.connected).map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 bg-gradient-to-br ${p.gradient} rounded-xl flex items-center justify-center`}>
                        <SocialIcon path={p.icon} color="white" size={16} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-[13px] font-bold ${c.text}`}>{p.name}</p>
                        <p className={`text-[11px] ${c.textSub}`}>Connecté</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Power className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-[11px] font-bold text-green-500">Actif</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
