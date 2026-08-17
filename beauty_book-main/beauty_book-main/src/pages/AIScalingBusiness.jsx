import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, Users, Calendar, DollarSign, Target,
  BarChart3, Zap, Crown, ChevronRight, Sparkles, Send,
  Rocket, Shield, Flame, Lightbulb, Bot
} from "lucide-react";
import { entities } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: "Analyser mon chiffre", prompt: "Analyse mon chiffre d'affaires actuel et donne-moi des recommandations pour augmenter mes revenus", gradient: "from-emerald-400 to-teal-500", bg: "bg-emerald-50" },
  { icon: Users, label: "Fidéliser clients", prompt: "Propose-moi des stratégies pour fidéliser mes clients et augmenter le taux de retour", gradient: "from-blue-400 to-indigo-500", bg: "bg-blue-50" },
  { icon: Target, label: "Objectifs", prompt: "Aide-moi à définir des objectifs réalistes pour mon salon et crée un plan d'action", gradient: "from-purple-400 to-violet-500", bg: "bg-purple-50" },
  { icon: Rocket, label: "Promo", prompt: "Crée une promotion attractive pour attirer de nouveaux clients dans mon salon", gradient: "from-orange-400 to-red-400", bg: "bg-orange-50" },
];

export default function AIScalingBusiness() {
  const navigate = useNavigate();
  const [proProfile, setProProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [stats, setStats] = useState({ rdv: 0, revenue: 0, clients: 0, services: 0, sources: {} });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        const profiles = await entities.ProfilPro.filter({ user_email: data.user.email }, "-created_at", 1);
        if (profiles.length > 0) setProProfile(profiles[0]);

        const [rdvs, services, clients] = await Promise.all([
          entities.Reservation.filter({ pro_email: data.user.email }, "-created_at", 500).catch(() => []),
          entities.Service.filter({ pro_email: data.user.email, status: "actif" }, "-created_at", 100).catch(() => []),
          entities.Client.filter({ pro_email: data.user.email }, "-created_at", 500).catch(() => []),
        ]);

        const confirmed = rdvs.filter(r => r.status === "confirme" || r.status === "termine");
        const totalRevenue = confirmed.reduce((sum, r) => sum + (r.total_price || r.price || 0), 0);

        const sourceBreakdown = {};
        rdvs.filter(r => r.status !== "annule").forEach(r => {
          const s = r.source || "app";
          if (!sourceBreakdown[s]) sourceBreakdown[s] = 0;
          sourceBreakdown[s]++;
        });

        setStats({
          rdv: confirmed.length,
          revenue: totalRevenue,
          clients: clients.length || new Set(confirmed.map(r => r.client_email)).size,
          services: services.length,
          sources: sourceBreakdown,
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

    const systemPrompt = `Tu es l'assistant Business IA de BeautyBook pour les professionnels du salon.

CONTEXTE DU SALON:
- Nom: ${proProfile?.salon_name || "Non renseigné"}
- Spécialités: ${proProfile?.specialites?.join(", ") || "Non renseigné"}
- Ville: ${proProfile?.city || "Non renseigné"}
- Note: ${proProfile?.rating || "N/A"}/5 (${proProfile?.reviews_count || 0} avis)
- Services actifs: ${stats.services}
- RDV confirmés: ${stats.rdv}
- Revenus totaux: ${stats.revenue}€
- Clients enregistrés: ${stats.clients}
- Sources des RDV: ${Object.entries(stats.sources || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "Aucune donnée"}

TU AIDES À:
1. Analyser le chiffre d'affaires et donner des recommandations concrètes
2. Fidéliser les clients (stratégies de rétention, programmes de fidélité)
3. Définir des objectifs réalistes et créer un plan d'action
4. Créer des promotions attractives
5. Optimiser les services et les prix
6. Développer la visibilité en ligne

STYLE: Réponds en français, de manière professionnelle mais accessible. Donne des conseils concrets, chiffrés et actionnables. Utilise des listes et des étapes claires quand c'est pertinent. Ne.JAMAIS d'emojis.`;

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
                'X-Title': 'BeautyBook AI Scaling Business',
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
              <h1 className="text-[18px] font-black text-gray-900 truncate">AI Scaling Business</h1>
              <span className="shrink-0 bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">IA</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">{proProfile?.salon_name || "Growth Assistant"}</p>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="px-5 pt-5 pb-4 space-y-5">

            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 p-5 text-white shadow-xl shadow-blue-500/20">
              <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full blur-xl" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full blur-lg" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[17px] font-black leading-tight">Poussez votre business</p>
                    <p className="text-[11px] text-white/70 font-medium">IA dédiée à la croissance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "RDV total", value: stats.rdv, icon: Calendar, color: "from-blue-500 to-blue-600" },
                { label: "Revenus", value: `${stats.revenue}€`, icon: DollarSign, color: "from-emerald-500 to-green-600" },
                { label: "Clients", value: stats.clients, icon: Users, color: "from-purple-500 to-violet-600" },
                { label: "Services", value: stats.services, icon: Target, color: "from-orange-500 to-amber-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                  <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2.5`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-[20px] font-black text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Source Breakdown */}
            {Object.keys(stats.sources || {}).length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Sources des RDV</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.sources).sort((a, b) => b[1] - a[1]).map(([src, count]) => {
                    const srcColors = {
                      app: "bg-orange-100 text-orange-600", receptionniste: "bg-green-100 text-green-600",
                      receptionniste_ia: "bg-green-100 text-green-600", ai_social_media: "bg-violet-100 text-violet-600",
                      maria_ai: "bg-orange-100 text-orange-600"
                    };
                    const srcLabels = {
                      app: "Application", receptionniste: "Receptionniste",
                      receptionniste_ia: "Receptionniste IA", ai_social_media: "AI Social Media", maria_ai: "Maria AI"
                    };
                    return (
                      <span key={src} className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${srcColors[src] || "bg-gray-100 text-gray-500"}`}>
                        {srcLabels[src] || src}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Actions rapides</p>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, gradient, bg }) => (
                  <button key={label} onClick={() => sendMessage(prompt)} className={`${bg} rounded-2xl p-4 text-left active:scale-[0.97] transition-all border border-gray-100`}>
                    <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[13px] font-black text-gray-800">{label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Suggestion */}
            <button onClick={() => sendMessage("Analyse mon activité et donne-moi un plan d'action pour développer mon salon")} className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl p-5 text-left text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[14px] font-black">Analyser mon activité</p>
                  <p className="text-[11px] text-white/70 font-medium">Obtenez un diagnostic + plan d'action IA</p>
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
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-md"
                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
                }`}>
                  <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-5 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(j => (
                      <span key={j} className="w-2 h-2 rounded-full animate-bounce" style={{ background: j === 0 ? "#6366f1" : j === 1 ? "#3b82f6" : "#93c5fd", animationDelay: `${j * 0.15}s` }} />
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
            placeholder="Demandez un conseil business..."
            className="flex-1 bg-transparent text-[14px] text-gray-700 outline-none placeholder:text-gray-400 font-medium"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all shrink-0 bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-blue-500/20"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
