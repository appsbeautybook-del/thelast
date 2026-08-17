import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, Users, Calendar, DollarSign, Target,
  BarChart3, Zap, Crown, ChevronRight, Sparkles, Send, Bot,
  MessageSquare, Clock, Star, PieChart, ArrowUpRight, Flame,
  Lightbulb, CheckCircle2, Rocket, Shield
} from "lucide-react";
import { entities } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";

const QUICK_ACTIONS = [
  {
    icon: TrendingUp, label: "Analyser mon chiffre",
    prompt: "Analyse mon chiffre d'affaires actuel et donne-moi des recommandations pour augmenter mes revenus",
    color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", textColor: "text-emerald-800"
  },
  {
    icon: Users, label: "Fidéliser clients",
    prompt: "Propose-moi des stratégies pour fidéliser mes clients et augmenter le taux de retour",
    color: "from-blue-500 to-indigo-600", bg: "bg-blue-50", textColor: "text-blue-800"
  },
  {
    icon: Target, label: "Atteindre mes objectifs",
    prompt: "Aide-moi à définir des objectifs réalistes pour mon salon et crée un plan d'action",
    color: "from-purple-500 to-violet-600", bg: "bg-purple-50", textColor: "text-purple-800"
  },
  {
    icon: Rocket, label: "Lancer une promo",
    prompt: "Crée une promotion attractive pour attirer de nouveaux clients dans mon salon",
    color: "from-orange-500 to-red-500", bg: "bg-orange-50", textColor: "text-orange-800"
  },
];

const BUSINESS_TIPS = [
  { icon: Flame, title: "Heures de pointe", desc: "Proposez des tarifs préférentiels aux heures creuses", color: "text-orange-500" },
  { icon: Crown, title: "Service premium", desc: "Ajoutez un service haut de gamme (+30% marge)", color: "text-yellow-500" },
  { icon: Shield, title: "Abonnement mensuel", desc: "Offrez un forfait illimité à vos fidèles", color: "text-blue-500" },
  { icon: Lightbulb, title: "Pack duo", desc: "Créez des offres pour 2 personnes (+25% CA)", color: "text-green-500" },
];

export default function AIScalingBusiness() {
  const navigate = useNavigate();
  const [proProfile, setProProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessStats, setBusinessStats] = useState({
    totalRDV: 0,
    revenue: 0,
    clients: 0,
    growth: 0
  });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        const profiles = await entities.ProfilPro.filter({ user_email: data.user.email }, "-created_at", 1);
        if (profiles.length > 0) {
          setProProfile(profiles[0]);
        }
        const rdvs = await entities.Reservation.filter({ pro_email: data.user.email }, "-created_at", 100).catch(() => []);
        const confirmed = rdvs.filter(r => r.status === "confirme" || r.status === "termine");
        const thisMonth = rdvs.filter(r => {
          const d = new Date(r.created_at);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        setBusinessStats({
          totalRDV: confirmed.length,
          revenue: confirmed.length * 45,
          clients: new Set(confirmed.map(r => r.client_email)).size,
          growth: Math.min(95, 40 + Math.floor(confirmed.length / 5))
        });
      } catch (e) {
        console.error("[AIScaling] Load error:", e);
      }
    };
    load();
  }, []);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);

    setMessages(prev => [...prev, { role: "user", content }]);

    const systemPrompt = `Tu es l'assistant Business IA de BeautyBook pour les professionnels du salon.
Tu aides les pros à développer leur activité, optimiser leur chiffre d'affaires, fidéliser leurs clients.
Tu connais bien l'industrie de la beauté : coiffure, manucure, soins, maquillage, barbe.
Tu donnes des conseils concrets, actionnables et personnalisés.
Tu réponds en français, de manière professionnelle mais accessible.
Tu utilises des emojis avec modération.
Tu donnes toujours des estimations chiffrées quand c'est possible.`;

    try {
      const OR_KEY_B64 = 'c2stb3ItdjEtOThjODllNjY1MzI5ZTdkYjg5YmQ3MmVmOGRiNzVjZTYyYjk1YWY4ZDRjMDNjOTI2YzZkZDIxOWE3NTcxMDRmZQ==';
      const OR_KEY = atob(OR_KEY_B64);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OR_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'BeautyBook AI Scaling Business',
        },
        body: JSON.stringify({
          model: 'google/gemma-4-31b-it:free',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || "Je n'ai pas pu traiter votre demande.";
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Erreur de connexion. Réessayez." }]);
      }
    } catch (e) {
      console.error("[AIScaling] AI error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: "Une erreur est survenue. Réessayez." }]);
    }
    setLoading(false);
  };

  return (
    <div className="font-display min-h-full bg-[#f8f7f5] flex flex-col">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-2xl flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0 bg-gradient-to-br from-indigo-500 to-blue-600">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-black text-gray-900 leading-none">AI Scaling Business</h1>
              <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-widest">IA</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">{proProfile?.salon_name || "Growth Assistant"}</p>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        {messages.length === 0 ? (
          <div className="px-4 pt-4 pb-4">

            {/* Welcome */}
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-4 text-white mb-4 shadow-lg shadow-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-black leading-tight">Poussez votre business ! 🚀</p>
                  <p className="text-[11px] text-white/80 font-medium">IA dédiée à la croissance de votre salon</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "RDV total", value: businessStats.totalRDV, icon: Calendar, color: "text-blue-600" },
                { label: "Revenus est.", value: `${businessStats.revenue}€`, icon: DollarSign, color: "text-green-600" },
                { label: "Clients", value: businessStats.clients, icon: Users, color: "text-purple-600" },
                { label: "Croissance", value: `${businessStats.growth}%`, icon: TrendingUp, color: "text-primary" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <p className="text-[9px] font-bold text-gray-400 uppercase">{label}</p>
                  </div>
                  <p className={`text-[18px] font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Actions rapides</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, color, bg, textColor }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  className={`${bg} rounded-2xl p-3.5 text-left active:scale-[0.97] transition-all border border-transparent hover:shadow-sm`}
                >
                  <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2 shadow-sm`}>
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <p className={`text-[12px] font-black ${textColor}`}>{label}</p>
                </button>
              ))}
            </div>

            {/* Tips */}
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Conseils du jour</p>
            <div className="space-y-2">
              {BUSINESS_TIPS.map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-gray-900">{title}</p>
                    <p className="text-[11px] text-gray-400 font-medium">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              ))}
            </div>

            {/* Growth Score */}
            <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score de croissance</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="url(#gradient)" strokeWidth="6"
                      strokeDasharray={`${businessStats.growth * 1.76} 176`} strokeLinecap="round" />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[14px] font-black text-indigo-600">{businessStats.growth}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black text-gray-900 mb-1">Potentiel de croissance</p>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                    {businessStats.growth >= 70 ? "Excellent ! Vous êtes sur la bonne voie." :
                     businessStats.growth >= 50 ? "Bien ! Quelques optimisations possibles." :
                     "À améliorer. Demandez des conseils à l'IA."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="px-4 py-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2.5`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-[18px] ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-br-[6px]"
                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-[6px] shadow-sm"
                }`}>
                  <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-[18px] rounded-bl-[6px] px-5 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(j => (
                      <span key={j} className="w-2 h-2 rounded-full animate-bounce" style={{ background: j === 0 ? "#6366f1" : j === 1 ? "#3b82f6" : "#93c5fd", animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── INPUT BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-30" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 16px))" }}>
        <div className="flex items-center gap-2 mx-4 mt-3 mb-2 rounded-2xl px-4 py-3 border border-gray-200 bg-gray-50">
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
            className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-md shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)" }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-center text-[9px] font-black uppercase tracking-widest pb-1 text-gray-300">
          AI Scaling Business · Croissez avec l'IA 🚀
        </p>
      </div>
    </div>
  );
}
