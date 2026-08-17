import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, Calendar, Clock, Users, TrendingUp, Settings,
  ChevronRight, Sparkles, Send, CalendarCheck, CalendarX, UserCheck,
  MessageSquare, Bot, CheckCircle, AlertCircle, MapPin, X
} from "lucide-react";
import { entities } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";

const QUICK_ACTIONS = [
  { icon: CalendarCheck, label: "Confirmers RDV", prompt: "Liste mes réservations en attente et aide-moi à les confirmer", color: "from-emerald-400 to-teal-500", bg: "bg-emerald-50", textColor: "text-emerald-600" },
  { icon: CalendarX, label: "Gérer annulations", prompt: "Montre les annulations récentes et propose des solutions pour remplacer les créneaux vides", color: "from-red-400 to-rose-500", bg: "bg-red-50", textColor: "text-red-500" },
  { icon: MessageSquare, label: "Relance clients", prompt: "Aide-moi à rédiger un message de relance pour les clients qui n'ont pas pris RDV récemment", color: "from-blue-400 to-indigo-500", bg: "bg-blue-50", textColor: "text-blue-600" },
  { icon: TrendingUp, label: "Optimiser agenda", prompt: "Analyse mon agenda de la semaine et propose des optimisations pour maximiser mon taux d'occupation", color: "from-purple-400 to-violet-500", bg: "bg-purple-50", textColor: "text-purple-600" },
];

const CONFIG_KEY = "bb_receptionnist_config";

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"); } catch { return {}; }
}

export default function ReceptionnistIA() {
  const navigate = useNavigate();
  const [proProfile, setProProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [todayStats, setTodayStats] = useState({ confirmed: 0, pending: 0, cancelled: 0, totalClients: 0 });
  const [todayRDVs, setTodayRDVs] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState(() => ({
    notifications: true,
    geolocation: false,
    autoRelance: false,
    ...loadConfig(),
  }));

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        const profiles = await entities.ProfilPro.filter({ user_email: data.user.email }, "-created_at", 1);
        if (profiles.length > 0) setProProfile(profiles[0]);
        const allRDVs = await entities.Reservation.filter({ pro_email: data.user.email }, "-created_at", 200).catch(() => []);
        const today = new Date().toISOString().split("T")[0];
        const todayAll = allRDVs.filter(r => r.date?.startsWith(today));
        setTodayRDVs(todayAll);
        setTodayStats({
          confirmed: todayAll.filter(r => r.status === "confirme").length,
          pending: todayAll.filter(r => r.status === "en_attente" || r.status === "pending").length,
          cancelled: todayAll.filter(r => r.status === "annule").length,
          totalClients: new Set(todayAll.map(r => r.client_email).filter(Boolean)).size,
        });
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content }]);

    const systemPrompt = `Tu es la Réceptionniste IA de BeautyBook pour les professionnels du salon.

CONTEXTE DU SALON:
- Nom: ${proProfile?.salon_name || "Non renseigné"}
- Spécialités: ${proProfile?.specialites?.join(", ") || "Non renseigné"}
- Ville: ${proProfile?.city || "Non renseigné"}
- RDV aujourd'hui: ${todayRDVs.length} (${todayStats.confirmed} confirmés, ${todayStats.pending} en attente, ${todayStats.cancelled} annulés)
- Clients uniques aujourd'hui: ${todayStats.totalClients}

TU GÈRES:
1. Les réservations: confirmer, annuler, modifier, proposer des créneaux
2. Les relances clients: messages de relance personnalisés
3. L'optimisation de l'agenda: suggestions pour maximiser le taux d'occupation
4. L'accueil client: réponses professionnelles et chaleureuses
5. La gestion des annulations: proposer des solutions pour remplacer les créneaux vides

STYLE: Réponds en français, de manière professionnelle et chaleureuse. Sois organisée, proactive et efficace. Donne des conseils concrets et des étapes claires. Ne.JAMAIS d'emojis.`;

    try {
      const OR_KEY_B64 = 'c2stb3ItdjEtOThjODllNjY1MzI5ZTdkYjg5YmQ3MmVmOGRiNzVjZTYyYjk1YWY4ZDRjMDNjOTI2YzZkZDIxOWE3NTcxMDRmZQ==';
      const OR_KEY = atob(OR_KEY_B64);
      const FREE_MODELS = [
        'openrouter/free',
        'google/gemma-4-31b-it:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'openai/gpt-oss-20b:free',
      ];
      let apiData = null;

      // Try Vercel serverless first
      try {
        const apiRes = await fetch('/api/ai/maria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content },
            ],
            temperature: 0.7,
            max_tokens: 512,
          }),
        });
        if (apiRes.ok) {
          const vData = await apiRes.json();
          if (vData?.choices?.[0]?.message?.content) apiData = vData;
        }
      } catch {}

      // Fallback: OpenRouter direct with model fallback
      if (!apiData) {
        for (const freeModel of FREE_MODELS) {
          try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OR_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'BeautyBook Receptionniste IA',
              },
              body: JSON.stringify({
                model: freeModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
                  { role: 'user', content },
                ],
                temperature: 0.7,
                max_tokens: 512,
              }),
            });
            if (res.ok) {
              apiData = await res.json();
              break;
            }
          } catch {}
        }
      }

      if (apiData?.choices?.[0]?.message?.content) {
        setMessages(prev => [...prev, { role: "assistant", content: apiData.choices[0].message.content }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Aucune API disponible. Vérifiez votre connexion." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Une erreur est survenue." }]);
    }
    setLoading(false);
  };

  const statusColors = {
    confirme: "bg-emerald-50 text-emerald-700 border-emerald-200",
    en_attente: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    annule: "bg-red-50 text-red-600 border-red-200",
  };
  const statusLabels = { confirme: "Confirmé", en_attente: "En attente", pending: "En attente", annule: "Annulé" };

  return (
    <div className="font-display h-full bg-gray-50 flex flex-col overflow-hidden">

      {/* ── HEADER ── */}
      <div className="bg-white px-5 pt-[env(safe-area-inset-top,12px)] pb-4 flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center active:scale-95 transition-all shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-black text-gray-900 truncate">Réceptionniste IA</h1>
              <span className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">IA</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">{proProfile?.salon_name || "Assistant personnel"}</p>
          </div>
          <button onClick={() => setShowConfig(true)} className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center active:scale-95 shrink-0">
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="px-5 pt-5 pb-4 space-y-5">

            {/* Today Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Confirmés", value: todayStats.confirmed, icon: CheckCircle, color: "from-emerald-500 to-green-600", ring: "ring-emerald-100" },
                { label: "En attente", value: todayStats.pending, icon: Clock, color: "from-amber-400 to-orange-500", ring: "ring-amber-100" },
                { label: "Annulés", value: todayStats.cancelled, icon: AlertCircle, color: "from-red-400 to-rose-500", ring: "ring-red-100" },
                { label: "Clients", value: todayStats.totalClients, icon: UserCheck, color: "from-blue-500 to-indigo-600", ring: "ring-blue-100" },
              ].map(({ label, value, icon: Icon, color, ring }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                  <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2.5 ring-8 ${ring}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-[20px] font-black text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Today's Appointments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Aujourd'hui</p>
                <span className="text-[11px] font-bold text-gray-300">{todayRDVs.length} RDV</span>
              </div>
              {todayRDVs.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-gray-50 shadow-sm">
                  <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-gray-400">Aucun RDV aujourd'hui</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayRDVs.slice(0, 5).map((rdv, i) => (
                    <div key={rdv.id || i} className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border border-gray-50">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                        <span className="text-[16px] font-black text-gray-800 leading-none">{rdv.date?.split("-")[2] || "—"}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{rdv.heure || "—"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-gray-900 truncate">{rdv.service_name || "Rendez-vous"}</p>
                        <p className="text-[11px] text-gray-400 font-medium truncate">{rdv.client_name || rdv.client_email || "Client"}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${statusColors[rdv.status] || statusColors.en_attente}`}>
                        {statusLabels[rdv.status] || "En attente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Actions rapides</p>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, color, bg, textColor }) => (
                  <button key={label} onClick={() => sendMessage(prompt)} className={`${bg} rounded-2xl p-4 text-left active:scale-[0.97] transition-all border border-gray-100`}>
                    <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-[13px] font-black ${textColor}`}>{label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Suggestion */}
            <button onClick={() => sendMessage("Donne-moi un résumé de ma journée et des actions à faire")} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-left text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[14px] font-black">Résumé de la journée</p>
                  <p className="text-[11px] text-white/70 font-medium">Obtenez un récap + actions prioritaires</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/50 ml-auto shrink-0" />
              </div>
            </button>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2.5`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md"
                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
                }`}>
                  <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-5 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(j => (
                      <span key={j} className="w-2 h-2 rounded-full animate-bounce" style={{ background: j === 0 ? "#10b981" : j === 1 ? "#14b8a6" : "#6ee7b7", animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ── INPUT BAR ── */}
      <div className="bg-white border-t border-gray-100 shrink-0 px-5 pt-3 pb-[calc(8px+env(safe-area-inset-bottom,8px))]">
        <div className="flex items-center gap-2.5 bg-gray-100 rounded-2xl px-4 py-2.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Demandez à la réceptionniste..."
            className="flex-1 bg-transparent text-[14px] text-gray-700 outline-none placeholder:text-gray-400 font-medium"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* ── CONFIG MODAL ── */}
      {showConfig && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center" onClick={() => setShowConfig(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-black text-gray-900">Paramètres</h3>
              <button onClick={() => setShowConfig(false)} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: "notifications", icon: Bell, label: "Notifications RDV", desc: "Recevoir une alerte pour chaque réservation" },
                { key: "geolocation", icon: MapPin, label: "Géolocalisation", desc: "Activer pour calculer les distances" },
                { key: "autoRelance", icon: MessageSquare, label: "Messages automatiques", desc: "Relance automatique après 30 jours d'inactivité" },
              ].map(({ key, icon: Icon, label, desc }) => (
                <div key={key} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-400 font-medium">{desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      const next = { ...config, [key]: !config[key] };
                      setConfig(next);
                      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
                    }}
                    className={`w-12 h-7 rounded-full flex items-center px-1 transition-all shrink-0 ${config[key] ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
